export interface ContactMap {
  [key: string]: string;
}

export interface AutoJournalSettings {
  contactsPath: string;
  outputPath: string;
  filenameTemplate: string;
  headingTemplate: string;
  useOpenAI: boolean;
  openAIApiKey: string;
  openAIModel: string;
  ollamaModel: string;
  ollamaUrl: string;
  imessageExporterPath: string;
  enableAutoImport: boolean;
  autoImportInterval: number; // in minutes
}

export interface MessageExport {
  date: string;
  messages: ConversationData[];
}

export interface ConversationData {
  header: string;
  content: string;
  filename: string;
  dateDir: string;
}

export interface SummaryResponse {
  summary: string;
  conversationId: string;
  filename: string;
}

export const DEFAULT_SETTINGS: AutoJournalSettings = {
  contactsPath: "Autojournal/contacts.vcf",
  outputPath: "Autojournal",
  filenameTemplate: "Daily Journal {date}",
  headingTemplate: "# Daily Journal - {date}",
  useOpenAI: false,
  openAIApiKey: "",
  openAIModel: "gpt-3.5-turbo",
  ollamaModel: "llama3.2",
  ollamaUrl: "http://localhost:11434",
  imessageExporterPath: "/opt/homebrew/bin/imessage-exporter",
  enableAutoImport: false,
  autoImportInterval: 60,
};
