import { Platform } from "obsidian";
import { ConversationData, MessageExport } from "./types";
import { ContactManager } from "./contactManager";

export class MessageProcessor {
  constructor(private contactManager: ContactManager) {}

  /**
   * Execute iMessage exporter command
   */
  async exportMessages(
    exporterPath: string,
    outputPath: string,
    startDate: string,
    endDate: string
  ): Promise<string> {
    if (!Platform.isDesktop) {
      throw new Error("iMessage export is only available on desktop platforms");
    }

    // This would need to be implemented using Node.js child_process
    // For now, we'll provide instructions to the user
    const command = `${exporterPath} -f txt -o "${outputPath}" -s "${startDate}" -e "${endDate}" -a macOS`;

    console.log("Run this command in terminal:", command);
    throw new Error(`Please run this command in terminal first: ${command}`);
  }

  /**
   * Parse exported message files from a directory
   */
  async parseMessageFiles(
    folderPath: string,
    dateStr: string
  ): Promise<ConversationData[]> {
    // This would need to be implemented using Node.js fs module
    // For now, we'll return empty array and provide instructions
    console.log(
      `Please copy message files from ${folderPath}/${dateStr} to your vault`
    );
    return [];
  }

  /**
   * Process message content and replace contacts
   */
  processMessageContent(content: string): string {
    return this.contactManager.replaceContactsInText(content);
  }

  /**
   * Parse conversations from a combined message file
   */
  parseConversationsFromText(fileContent: string): ConversationData[] {
    const conversations: ConversationData[] = [];

    // Split the content by conversation sections
    const sections = fileContent.split(/===\s+Content\s+from\s+.*?===/);
    const headers = fileContent.match(/===\s+Content\s+from\s+.*?===/g) || [];

    for (let i = 0; i < headers.length && i + 1 < sections.length; i++) {
      const header = headers[i];
      const content = sections[i + 1].trim();

      if (content.length < 50) {
        continue;
      }

      // Extract date directory from header
      const dateMatch = header.match(
        /===\s+Content\s+from\s+(\d{2}_\d{2})\/(.+?)\.txt\s+===/
      );
      const dateDir = dateMatch?.[1] || "unknown";
      let filename = dateMatch?.[2] || `conversation_${i + 1}`;

      // Try to replace filename with contact name if it looks like a phone/email
      const contactName = this.getContactNameForFilename(filename);
      if (contactName) {
        console.log(
          `Replaced filename "${filename}" with contact name "${contactName}"`
        );
        filename = contactName;
      }

      conversations.push({
        header,
        content: this.processMessageContent(content),
        filename,
        dateDir,
      });
    }

    return conversations;
  }

  /**
   * Get contact name for a filename that might be a phone number or email
   */
  private getContactNameForFilename(filename: string): string | null {
    // If it's already a meaningful name (not just numbers/emails), keep it
    if (this.isMeaningfulName(filename)) {
      console.log(`Preserving meaningful name: "${filename}"`);
      return null; // Keep the original name
    }

    // Check if it looks like a group chat (contains multiple phone numbers/emails)
    if (this.isGroupChat(filename)) {
      return this.getGroupChatName(filename);
    }

    // Check if it looks like a single phone number (contains only digits, +, -, (, ), spaces)
    const phonePattern = /^[\d\s\+\-\(\)]+$/;
    // Check if it looks like a single email (contains @)
    const emailPattern = /@/;

    if (phonePattern.test(filename) || emailPattern.test(filename)) {
      return this.contactManager.getContactName(filename);
    }

    return null;
  }

  /**
   * Check if a filename is already a meaningful name (not just numbers/emails)
   */
  private isMeaningfulName(filename: string): boolean {
    // If it contains letters and spaces, it's likely a meaningful name
    const hasLetters = /[a-zA-Z]/.test(filename);
    const hasSpaces = /\s/.test(filename);

    // If it has letters and spaces, it's probably a meaningful name
    if (hasLetters && hasSpaces) {
      return true;
    }

    // If it's just a single word with letters (no numbers), it might be a meaningful name
    const isSingleWord = /^[a-zA-Z]+$/.test(filename);
    if (isSingleWord) {
      return true;
    }

    // If it contains common group chat naming patterns
    const groupNamePatterns = [
      /team/i,
      /group/i,
      /family/i,
      /friends/i,
      /work/i,
      /class/i,
      /project/i,
      /club/i,
      /crew/i,
      /squad/i,
    ];

    if (groupNamePatterns.some((pattern) => pattern.test(filename))) {
      return true;
    }

    return false;
  }

  /**
   * Check if a filename represents a group chat
   */
  private isGroupChat(filename: string): boolean {
    // Group chats typically have multiple phone numbers or emails separated by delimiters
    // Common delimiters: comma, semicolon, space, underscore, dash
    const groupChatPatterns = [
      /[\d\s\+\-\(\)]+[,;\s_\-]+[\d\s\+\-\(\)]+/, // Multiple phone numbers
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[,;\s_\-]+[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Multiple emails
      /[\d\s\+\-\(\)]+[,;\s_\-]+[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Phone + email
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[,;\s_\-]+[\d\s\+\-\(\)]+/, // Email + phone
    ];

    const isGroup = groupChatPatterns.some((pattern) => pattern.test(filename));
    if (isGroup) {
      console.log(`Detected group chat: "${filename}"`);
    }
    return isGroup;
  }

  /**
   * Generate a name for a group chat based on its participants
   */
  private getGroupChatName(filename: string): string {
    // Split by common delimiters
    const participants = filename
      .split(/[,;\s_\-]+/)
      .filter((p) => p.trim().length > 0);

    if (participants.length === 0) {
      return filename; // Fallback to original filename
    }

    // Try to get contact names for each participant
    const contactNames: string[] = [];
    for (const participant of participants) {
      const contactName = this.contactManager.getContactName(participant);
      if (contactName) {
        contactNames.push(contactName);
      } else {
        // If no contact name found, use a shortened version of the phone/email
        if (participant.includes("@")) {
          contactNames.push(participant.split("@")[0]); // Use email username
        } else {
          contactNames.push(participant.slice(-4)); // Use last 4 digits of phone
        }
      }
    }

    // Create group chat name
    if (contactNames.length === 0) {
      return `Group Chat (${participants.length} participants)`;
    } else if (contactNames.length === 1) {
      return `${contactNames[0]} & Others`;
    } else if (contactNames.length <= 3) {
      return contactNames.join(", ");
    } else {
      return `${contactNames.slice(0, 2).join(", ")} & ${
        contactNames.length - 2
      } others`;
    }
  }

  /**
   * Create a formatted date string for export (YYYY-MM-DD)
   */
  getDateString(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * Get yesterday's date for default export
   */
  getYesterdayDate(): Date {
    const today = new Date();
    // Create a new date object to avoid mutating the original
    const yesterday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - 1
    );
    return yesterday;
  }

  /**
   * Format date for directory name (MM_DD)
   */
  formatDateForDirectory(date: Date): string {
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${month}_${day}`;
  }

  /**
   * Get the target date for journal creation (should match the export date)
   */
  getTargetDateForJournal(startDate: string): Date {
    return new Date(startDate);
  }

  /**
   * Generate filename using template
   */
  generateFilename(template: string, date: Date): string {
    const dateStr = this.getDateString(date);
    return template.replace("{date}", dateStr) + ".md";
  }

  /**
   * Generate heading using template
   */
  generateHeading(template: string, date: Date): string {
    const dateStr = this.getDateString(date);
    return template.replace("{date}", dateStr);
  }

  /**
   * Generate a daily summary from conversations
   */
  generateDailySummary(
    conversations: ConversationData[],
    summaries: Array<{ summary: string; filename: string }>,
    llmInfo?: string,
    targetDate?: Date,
    headingTemplate?: string
  ): string {
    // Use the target date if provided, otherwise use today
    const journalDate = targetDate || new Date();
    const dateStr = this.getDateString(journalDate);

    // Generate heading using template or fallback to default
    const heading =
      headingTemplate && headingTemplate.trim()
        ? this.generateHeading(headingTemplate, journalDate)
        : headingTemplate === "" ||
          headingTemplate === null ||
          headingTemplate === undefined
        ? "" // No heading if explicitly empty
        : `# Daily Journal - ${dateStr}`; // Default heading if not provided

    let summary = heading ? `${heading}\n\n` : "";
    summary += `Generated on ${new Date().toLocaleString()}\n`;
    if (llmInfo) {
      summary += `Generated with: ${llmInfo}\n`;
    }
    summary += "\n";

    if (summaries.length === 0) {
      summary += "No conversations found for this day.\n";
      return summary;
    }

    for (const item of summaries) {
      summary += `### ${item.filename}\n\n`;
      summary += `${item.summary}\n\n`;
      summary += "---\n\n";
    }

    return summary;
  }
}
