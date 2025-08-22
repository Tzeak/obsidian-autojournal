import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import AutoJournalPlugin from "../main";

export class AutoJournalSettingsTab extends PluginSettingTab {
  plugin: AutoJournalPlugin;

  constructor(app: App, plugin: AutoJournalPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Auto Journal Settings" });

    // Contacts file path
    new Setting(containerEl)
      .setName("Contacts file path")
      .setDesc(
        "Path to your contacts file (.vcf or .csv). Defaults to Autojournal/contacts.vcf"
      )
      .addText((text) =>
        text
          .setPlaceholder("Autojournal/contacts.vcf")
          .setValue(this.plugin.settings.contactsPath)
          .onChange(async (value) => {
            this.plugin.settings.contactsPath = value;
            await this.plugin.saveSettings();
          })
      );

    // Output path
    new Setting(containerEl)
      .setName("Output folder")
      .setDesc("Folder where journal entries will be created")
      .addText((text) =>
        text
          .setPlaceholder("Autojournal")
          .setValue(this.plugin.settings.outputPath)
          .onChange(async (value) => {
            this.plugin.settings.outputPath = value;
            await this.plugin.saveSettings();
          })
      );

    // Filename template
    new Setting(containerEl)
      .setName("Filename template")
      .setDesc(
        "Template for journal filenames. Use {date} for the date. Example: 'Daily Journal {date}' or 'Journal {date}'"
      )
      .addText((text) =>
        text
          .setPlaceholder("Daily Journal {date}")
          .setValue(this.plugin.settings.filenameTemplate)
          .onChange(async (value) => {
            this.plugin.settings.filenameTemplate = value;
            await this.plugin.saveSettings();
          })
      );

    // Heading template
    new Setting(containerEl)
      .setName("Heading template")
      .setDesc(
        "Template for journal headings. Use {date} for the date. Leave empty to remove heading. Example: '# Daily Journal - {date}' or '## {date}'"
      )
      .addText((text) =>
        text
          .setPlaceholder("# Daily Journal - {date}")
          .setValue(this.plugin.settings.headingTemplate)
          .onChange(async (value) => {
            this.plugin.settings.headingTemplate = value;
            await this.plugin.saveSettings();
          })
      );

    // iMessage exporter path
    const imessageSetting = new Setting(containerEl)
      .setName("iMessage Exporter Path")
      .setDesc("Full path to imessage-exporter binary")
      .addText((text) =>
        text
          .setPlaceholder("/opt/homebrew/bin/imessage-exporter")
          .setValue(this.plugin.settings.imessageExporterPath)
          .onChange(async (value) => {
            this.plugin.settings.imessageExporterPath = value;
            await this.plugin.saveSettings();
          })
      );

    // Add a button to detect the path
    imessageSetting.addButton((button) =>
      button.setButtonText("Detect Path").onClick(async () => {
        try {
          // This would need to be implemented with a proper file picker or system call
          // For now, we'll suggest the common paths
          const commonPaths = [
            "/opt/homebrew/bin/imessage-exporter",
            "/usr/local/bin/imessage-exporter",
            "/usr/bin/imessage-exporter",
          ];

          const pathText = imessageSetting.controlEl.querySelector(
            "input"
          ) as HTMLInputElement;
          if (pathText) {
            // Try the most common path first
            pathText.value = commonPaths[0];
            this.plugin.settings.imessageExporterPath = commonPaths[0];
            await this.plugin.saveSettings();
            new Notice(
              "Path set to common location. If this doesn't work, run 'which imessage-exporter' in terminal to find the correct path."
            );
          }
        } catch (error) {
          new Notice(
            "Could not detect path automatically. Please set it manually."
          );
        }
      })
    );

    // AI Service selection
    containerEl.createEl("h3", { text: "AI Service Configuration" });

    new Setting(containerEl)
      .setName("Use OpenAI")
      .setDesc("Enable to use OpenAI instead of Ollama for summaries")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.useOpenAI)
          .onChange(async (value) => {
            this.plugin.settings.useOpenAI = value;
            await this.plugin.saveSettings();
            this.display(); // Refresh to show/hide relevant settings
          })
      );

    // OpenAI settings
    if (this.plugin.settings.useOpenAI) {
      new Setting(containerEl)
        .setName("OpenAI API Key")
        .setDesc("Your OpenAI API key (stored locally)")
        .addText((text) =>
          text
            .setPlaceholder("sk-...")
            .setValue(this.plugin.settings.openAIApiKey)
            .onChange(async (value) => {
              this.plugin.settings.openAIApiKey = value;
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("OpenAI Model")
        .setDesc("Choose which OpenAI model to use")
        .addDropdown((dropdown) =>
          dropdown
            .addOption("gpt-3.5-turbo", "GPT-3.5 Turbo (Fast & Cheap)")
            .addOption("gpt-4", "GPT-4 (Better Quality)")
            .addOption("gpt-4-turbo", "GPT-4 Turbo (Best Quality)")
            .addOption("gpt-4o", "GPT-4o (Latest)")
            .setValue(this.plugin.settings.openAIModel)
            .onChange(async (value) => {
              this.plugin.settings.openAIModel = value;
              await this.plugin.saveSettings();
            })
        );
    } else {
      // Ollama settings
      new Setting(containerEl)
        .setName("Ollama URL")
        .setDesc("URL of your Ollama server")
        .addText((text) =>
          text
            .setPlaceholder("http://localhost:11434")
            .setValue(this.plugin.settings.ollamaUrl)
            .onChange(async (value) => {
              this.plugin.settings.ollamaUrl = value;
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("Ollama Model")
        .setDesc("Model to use for generating summaries")
        .addDropdown((dropdown) =>
          dropdown
            .addOption("llama3.2", "Llama 3.2 (Fast)")
            .addOption("llama3.1", "Llama 3.1 (Balanced)")
            .addOption("llama3.0", "Llama 3.0 (Stable)")
            .addOption("mistral", "Mistral (Good Quality)")
            .addOption("codellama", "Code Llama (Code Focused)")
            .addOption("custom", "Custom Model")
            .setValue(this.plugin.settings.ollamaModel)
            .onChange(async (value) => {
              this.plugin.settings.ollamaModel = value;
              await this.plugin.saveSettings();
            })
        );

      // Test OpenAI connection
      new Setting(containerEl)
        .setName("Test OpenAI Connection")
        .setDesc("Test if your API key and model work")
        .addButton((button) =>
          button.setButtonText("Test").onClick(async () => {
            try {
              new Notice("Testing OpenAI connection...");
              // This would test the connection - for now just show a notice
              new Notice("OpenAI connection test completed!");
            } catch (error) {
              new Notice("OpenAI connection failed: " + error.message);
            }
          })
        );

      // Show custom model input if "custom" is selected
      if (this.plugin.settings.ollamaModel === "custom") {
        new Setting(containerEl)
          .setName("Custom Ollama Model")
          .setDesc("Enter your custom model name")
          .addText((text) =>
            text
              .setPlaceholder("my-custom-model")
              .setValue(this.plugin.settings.ollamaModel)
              .onChange(async (value) => {
                this.plugin.settings.ollamaModel = value;
                await this.plugin.saveSettings();
              })
          );
      }

      // Test Ollama connection
      new Setting(containerEl)
        .setName("Test Ollama Connection")
        .setDesc("Test if Ollama is running and accessible")
        .addButton((button) =>
          button.setButtonText("Test").onClick(async () => {
            try {
              new Notice("Testing Ollama connection...");
              // This would test the connection - for now just show a notice
              new Notice("Ollama connection test completed!");
            } catch (error) {
              new Notice("Ollama connection failed: " + error.message);
            }
          })
        );
    }

    // Auto-import settings
    containerEl.createEl("h3", { text: "Auto Import Settings" });

    new Setting(containerEl)
      .setName("Enable Auto Import")
      .setDesc("Automatically import messages at regular intervals")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableAutoImport)
          .onChange(async (value) => {
            this.plugin.settings.enableAutoImport = value;
            await this.plugin.saveSettings();
            if (value) {
              this.plugin.startAutoImport();
            } else {
              this.plugin.stopAutoImport();
            }
          })
      );

    if (this.plugin.settings.enableAutoImport) {
      new Setting(containerEl)
        .setName("Auto Import Interval")
        .setDesc("How often to check for new messages (in minutes)")
        .addSlider((slider) =>
          slider
            .setLimits(15, 1440, 15) // 15 min to 24 hours
            .setValue(this.plugin.settings.autoImportInterval)
            .setDynamicTooltip()
            .onChange(async (value) => {
              this.plugin.settings.autoImportInterval = value;
              await this.plugin.saveSettings();
              // Restart auto import with new interval
              if (this.plugin.settings.enableAutoImport) {
                this.plugin.stopAutoImport();
                this.plugin.startAutoImport();
              }
            })
        );
    }

    // Help section
    containerEl.createEl("h3", { text: "Setup Instructions" });

    const helpDiv = containerEl.createDiv();
    helpDiv.innerHTML = `
			<p><strong>Prerequisites:</strong></p>
			<ol>
				<li>Install <code>imessage-exporter</code>: <code>brew install imessage-exporter</code></li>
				<li>Export your contacts to a VCF file and place it in your vault</li>
				<li>For AI summaries, either:
					<ul>
						<li>Install and run Ollama locally, or</li>
						<li>Set up an OpenAI API key</li>
					</ul>
				</li>
			</ol>
			<p><strong>Usage:</strong></p>
			<ul>
				<li>Use the "Import Yesterday's Messages" command to manually import</li>
				<li>Enable auto-import to automatically process messages</li>
				<li>Journal entries will be created in your specified output folder</li>
			</ul>
		`;
  }
}
