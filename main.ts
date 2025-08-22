import { Notice, Plugin, TFile } from "obsidian";
import { AutoJournalSettings, DEFAULT_SETTINGS } from "./src/types";
import { ContactManager } from "./src/contactManager";
import { MessageProcessor } from "./src/messageProcessor";
import { AISummarizer } from "./src/aiSummarizer";
import { AutoJournalSettingsTab } from "./src/settingsTab";

export default class AutoJournalPlugin extends Plugin {
  settings: AutoJournalSettings;
  contactManager: ContactManager;
  messageProcessor: MessageProcessor;
  aiSummarizer: AISummarizer;
  autoImportInterval: number | null = null;
  lastExportDateDir: string | null = null;
  lastExportStartDate: string | null = null;
  lastExportEndDate: string | null = null;

  async onload() {
    await this.loadSettings();

    // Initialize components
    this.contactManager = new ContactManager();
    this.messageProcessor = new MessageProcessor(this.contactManager);
    this.aiSummarizer = new AISummarizer(this.settings);

    // Load contacts if path is configured
    if (this.settings.contactsPath) {
      await this.loadContacts();
    }

    // Add ribbon icon
    this.addRibbonIcon("calendar-days", "Import Messages", () => {
      this.importYesterdayMessages();
    });

    // Add commands
    this.addCommand({
      id: "import-yesterday-messages",
      name: "Import Yesterday's Messages",
      callback: () => this.importYesterdayMessages(),
    });

    this.addCommand({
      id: "import-custom-date-messages",
      name: "Import Messages for Custom Date",
      callback: () => this.importCustomDateMessages(),
    });

    this.addCommand({
      id: "process-existing-messages",
      name: "Process Existing Message File",
      callback: () => this.processExistingMessages(),
    });

    this.addCommand({
      id: "process-exported-files",
      name: "Process Exported Files",
      callback: () => this.processExportedFiles(),
    });

    this.addCommand({
      id: "reload-contacts",
      name: "Reload Contacts",
      callback: () => this.loadContacts(),
    });

    // Add settings tab
    this.addSettingTab(new AutoJournalSettingsTab(this.app, this));

    // Start auto import if enabled
    if (this.settings.enableAutoImport) {
      this.startAutoImport();
    }

    console.log("Auto Journal plugin loaded");
  }

  onunload() {
    this.stopAutoImport();
    console.log("Auto Journal plugin unloaded");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    // Update AI summarizer with new settings
    this.aiSummarizer = new AISummarizer(this.settings);
  }

  async loadContacts() {
    if (!this.settings.contactsPath) {
      new Notice("Contacts path not configured");
      return;
    }

    try {
      const file = this.app.vault.getAbstractFileByPath(
        this.settings.contactsPath
      );
      if (!file || !(file instanceof TFile)) {
        new Notice("Contacts file not found");
        return;
      }

      const content = await this.app.vault.read(file);

      if (this.settings.contactsPath.endsWith(".vcf")) {
        this.contactManager.loadContactsFromVcf(content);
      } else if (this.settings.contactsPath.endsWith(".csv")) {
        this.contactManager.loadContactsFromCsv(content);
      } else {
        new Notice("Unsupported contact file format. Use .vcf or .csv");
        return;
      }

      new Notice("Contacts loaded successfully");
    } catch (error) {
      console.error("Error loading contacts:", error);
      new Notice("Failed to load contacts");
    }
  }

  async loadContactsAutomatically() {
    try {
      // First try the configured contacts path
      if (this.settings.contactsPath) {
        await this.loadContacts();
        return;
      }

      // If no configured path, try to find contacts in the default location
      const defaultContactsPath = "Autojournal/contacts.vcf";
      const contactsFile =
        this.app.vault.getAbstractFileByPath(defaultContactsPath);
      if (contactsFile && contactsFile instanceof TFile) {
        new Notice(
          `Found contacts.vcf in ${defaultContactsPath}, loading contacts...`
        );
        const content = await this.app.vault.read(contactsFile);
        this.contactManager.loadContactsFromVcf(content);
        new Notice(`Contacts loaded from ${defaultContactsPath}`);

        // Auto-set the contacts path for future use
        this.settings.contactsPath = defaultContactsPath;
        await this.saveSettings();
        console.log(`Auto-configured contacts path to ${defaultContactsPath}`);
        return;
      }

      // Also check for contacts.csv in default location
      const defaultContactsCsvPath = "Autojournal/contacts.csv";
      const contactsCsvFile = this.app.vault.getAbstractFileByPath(
        defaultContactsCsvPath
      );
      if (contactsCsvFile && contactsCsvFile instanceof TFile) {
        new Notice(
          `Found contacts.csv in ${defaultContactsCsvPath}, loading contacts...`
        );
        const content = await this.app.vault.read(contactsCsvFile);
        this.contactManager.loadContactsFromCsv(content);
        new Notice(`Contacts loaded from ${defaultContactsCsvPath}`);

        // Auto-set the contacts path for future use
        this.settings.contactsPath = defaultContactsCsvPath;
        await this.saveSettings();
        console.log(
          `Auto-configured contacts path to ${defaultContactsCsvPath}`
        );
        return;
      }

      console.log(
        "No contacts file found - proceeding without contact replacement"
      );
    } catch (error) {
      console.error("Error loading contacts automatically:", error);
      // Don't show error notice - just log it and continue without contacts
    }
  }

  async importYesterdayMessages() {
    const yesterday = this.messageProcessor.getYesterdayDate();
    const startDate = this.messageProcessor.getDateString(yesterday);
    // For yesterday's messages, we want messages from yesterday only
    // So end date should be the day after yesterday (exclusive)
    const dayAfterYesterday = new Date(yesterday);
    dayAfterYesterday.setDate(dayAfterYesterday.getDate() + 1);
    const endDate = this.messageProcessor.getDateString(dayAfterYesterday);

    console.log(`Yesterday date object: ${yesterday}`);
    console.log(`Yesterday date string: ${startDate}`);
    console.log(`Day after yesterday: ${endDate}`);

    await this.importMessages(startDate, endDate);
  }

  async importCustomDateMessages() {
    // Create a modal for date input
    const dateInput = await this.promptForDate();
    if (!dateInput) return;

    const endDate = new Date(dateInput);
    endDate.setDate(endDate.getDate() + 1);

    await this.importMessages(
      dateInput,
      this.messageProcessor.getDateString(endDate)
    );
  }

  async importMessages(startDate: string, endDate: string) {
    try {
      new Notice("Starting message import...");

      // Check if imessage-exporter path is configured
      if (!this.settings.imessageExporterPath) {
        new Notice(
          "iMessage exporter path not configured. Please set it in settings.",
          8000
        );
        return;
      }

      // The directory should match the target date (the date we're actually exporting)
      // For "yesterday's messages", this should be yesterday's date
      // Parse the startDate more explicitly to avoid timezone issues
      const [year, month, day] = startDate.split("-").map(Number);
      const targetDate = new Date(year, month - 1, day); // month is 0-indexed
      const dateDir = this.messageProcessor.formatDateForDirectory(targetDate);

      console.log(`Target date object: ${targetDate}`);
      console.log(
        `Target date formatted: ${this.messageProcessor.getDateString(
          targetDate
        )}`
      );
      console.log(`Directory name: ${dateDir}`);

      // Try to get the vault's absolute path
      let vaultPath = "";
      try {
        // Try different methods to get the vault path using type assertions
        const adapter = this.app.vault.adapter as any;
        if (adapter.getFullPath) {
          vaultPath = adapter.getFullPath("");
        } else if (adapter.getResourcePath) {
          vaultPath = adapter.getResourcePath("");
        } else if (adapter.getBasePath) {
          vaultPath = adapter.getBasePath();
        } else if (adapter.basePath) {
          vaultPath = adapter.basePath;
        }
      } catch (e) {
        console.log("Could not get vault path automatically");
      }

      // Use the configured output path for exports
      const exportPath = vaultPath
        ? `${vaultPath}/${this.settings.outputPath}/${dateDir}`
        : `${this.settings.outputPath}/${dateDir}`;
      const exportCommand = `${this.settings.imessageExporterPath} -f txt -o "${exportPath}" -s "${startDate}" -e "${endDate}" -a macOS`;

      // Copy command to clipboard
      await navigator.clipboard.writeText(exportCommand);
      new Notice(
        "Command copied to clipboard! Run it in terminal from anywhere, then click 'Process Exported Files'",
        8000
      );

      // Store the date directory for later processing
      this.lastExportDateDir = dateDir;
      this.lastExportStartDate = startDate;
      this.lastExportEndDate = endDate;

      console.log(
        `Export date info: startDate=${startDate}, endDate=${endDate}, dateDir=${dateDir}`
      );
      console.log(
        `Date explanation: Exporting messages from ${startDate} (inclusive) to ${endDate} (exclusive), storing in directory ${dateDir}`
      );

      // Show instructions for next steps
      this.showExportInstructions(dateDir);
    } catch (error) {
      console.error("Error importing messages:", error);
      new Notice("Failed to import messages");
    }
  }

  async processExistingMessages() {
    try {
      // Let user select a message file to process
      const files = this.app.vault
        .getFiles()
        .filter(
          (f) =>
            f.name.includes("converted_messages") ||
            (f.name.includes(".txt") &&
              f.path.includes(this.settings.outputPath))
        );

      if (files.length === 0) {
        new Notice("No message files found. Please import messages first.");
        return;
      }

      // For simplicity, process the first found file
      // In a full implementation, you'd show a file picker
      const file = files[0];
      const content = await this.app.vault.read(file);

      await this.processMessageContent(content);
    } catch (error) {
      console.error("Error processing messages:", error);
      new Notice("Failed to process messages");
    }
  }

  async processExportedFiles() {
    if (!this.lastExportDateDir) {
      new Notice(
        "No export session found. Please run 'Import Yesterday's Messages' first."
      );
      return;
    }

    try {
      new Notice("Processing exported files...");

      // Look for the exported files in the expected location
      const expectedPath = `${this.settings.outputPath}/${this.lastExportDateDir}`;
      const exportedFiles = this.app.vault
        .getFiles()
        .filter(
          (f) => f.path.startsWith(expectedPath) && f.extension === "txt"
        );

      if (exportedFiles.length === 0) {
        new Notice(
          `No exported files found in ${expectedPath}. Make sure you ran the export command and the files are in your vault.`
        );
        return;
      }

      // Combine all exported files into one content with progress
      let combinedContent = "";
      for (let i = 0; i < exportedFiles.length; i++) {
        const file = exportedFiles[i];
        new Notice(
          `Reading file ${i + 1}/${exportedFiles.length}: ${file.name}`,
          1500
        );
        const content = await this.app.vault.read(file);
        combinedContent += `=== Content from ${this.lastExportDateDir}/${file.name} ===\n`;
        combinedContent += content + "\n\n";
      }

      // Process the combined content
      await this.processMessageContent(combinedContent);
    } catch (error) {
      console.error("Error processing exported files:", error);
      new Notice("Failed to process exported files");
    }
  }

  async processMessageContent(content: string) {
    try {
      new Notice("Processing messages...");

      // First, try to load contacts automatically
      await this.loadContactsAutomatically();

      // Parse conversations from the content (this also replaces contacts)
      const conversations =
        this.messageProcessor.parseConversationsFromText(content);

      if (conversations.length === 0) {
        new Notice("No conversations found in the file");
        return;
      }

      new Notice(
        `Found ${conversations.length} conversations. Contact replacement applied. Generating summaries...`
      );

      // Generate summaries with progress
      const summaries = await this.aiSummarizer.generateSummaries(
        conversations,
        (current, total) => {
          new Notice(`Generating summaries... ${current}/${total}`, 2000);
        }
      );

      // Get LLM info for the daily summary
      const llmInfo = this.settings.useOpenAI
        ? `OpenAI ${this.settings.openAIModel}`
        : `Ollama ${this.settings.ollamaModel}`;

      // Get the target date for the journal (should match the export date)
      const targetDate = this.lastExportStartDate
        ? this.messageProcessor.getTargetDateForJournal(
            this.lastExportStartDate
          )
        : new Date();

      console.log(
        `Journal target date: ${this.messageProcessor.getDateString(
          targetDate
        )}`
      );

      // Create journal entry
      const journalContent = this.messageProcessor.generateDailySummary(
        conversations,
        summaries,
        llmInfo,
        targetDate,
        this.settings.headingTemplate
      );

      // Save to vault using the target date and filename template
      const filename = `${
        this.settings.outputPath
      }/${this.messageProcessor.generateFilename(
        this.settings.filenameTemplate,
        targetDate
      )}`;

      // Ensure output directory exists
      const outputDir = this.settings.outputPath;
      if (!this.app.vault.getAbstractFileByPath(outputDir)) {
        await this.app.vault.createFolder(outputDir);
      }

      // Create or update the journal file
      const existingFile = this.app.vault.getAbstractFileByPath(filename);
      if (existingFile instanceof TFile) {
        await this.app.vault.modify(existingFile, journalContent);
        new Notice(`Journal entry updated: ${filename}`);
      } else {
        await this.app.vault.create(filename, journalContent);
        new Notice(`Journal entry created: ${filename}`);
      }

      // Open the journal file for the user
      const createdFile = this.app.vault.getAbstractFileByPath(filename);
      if (createdFile instanceof TFile) {
        await this.app.workspace.getLeaf().openFile(createdFile);
      }
    } catch (error) {
      console.error("Error processing message content:", error);
      new Notice(`Failed to process messages: ${error.message}`);
    }
  }

  private showExportInstructions(dateDir: string) {
    const instructions = `
Export Instructions:

1. ✅ Command copied to clipboard - paste it in terminal and run it from anywhere
2. The export will create files directly in your vault at: ${this.settings.outputPath}/${dateDir}/
3. Run "Auto Journal: Process Exported Files" command to create your daily summary

The plugin will automatically:
- Replace phone numbers with contact names
- Generate AI summaries of conversations
- Create a daily journal entry in your output folder
		`;

    console.log(instructions);
    new Notice("Check console for next steps", 8000);
  }

  private async promptForDate(): Promise<string | null> {
    // Simple prompt - in a full implementation you'd create a proper modal
    const date = prompt("Enter date (YYYY-MM-DD):");
    if (!date) return null;

    // Basic validation
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      new Notice("Invalid date format. Use YYYY-MM-DD");
      return null;
    }

    return date;
  }

  startAutoImport() {
    if (this.autoImportInterval) {
      this.stopAutoImport();
    }

    const intervalMs = this.settings.autoImportInterval * 60 * 1000; // Convert minutes to milliseconds

    this.autoImportInterval = window.setInterval(() => {
      this.importYesterdayMessages();
    }, intervalMs);

    new Notice(
      `Auto-import started (every ${this.settings.autoImportInterval} minutes)`
    );
  }

  stopAutoImport() {
    if (this.autoImportInterval) {
      window.clearInterval(this.autoImportInterval);
      this.autoImportInterval = null;
    }
  }
}
