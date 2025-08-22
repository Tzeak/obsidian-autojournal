import { AutoJournalSettings, SummaryResponse } from "./types";
import { requestUrl } from "obsidian";

export class AISummarizer {
  constructor(private settings: AutoJournalSettings) {}

  private readonly systemPrompt = {
    role: "system",
    content: `you're helping me summarize a chunk of an iMessage conversation

below is part of the transcript. each message includes:
	•	a timestamp
	•	the sender's name ("Me" means a message from me. others are labeled with their names)
	•	the message text
	•	sometimes: tapback reactions (e.g. "Loved by …", "Laughed by …")

it might be a group convo with 3 or more people

read it and give me a one to two sentence summary, in second-person, saying who you were talking to and what it was about. Use natural language like you're casually recounting what the convo was about. Don't introduce the summary. Don't refer to anyone as "they said" or "you said" — just use natural language.

here's the conversation:`,
  };

  /**
   * Check if Ollama server is accessible
   */
  private async checkOllamaHealth(): Promise<boolean> {
    try {
      const response = await requestUrl({
        url: this.settings.ollamaUrl,
        method: "GET",
      });
      return response.status === 200;
    } catch (error) {
      console.error("Ollama health check failed:", error);
      return false;
    }
  }

  /**
   * Generate summary using OpenAI
   */
  private async generateOpenAISummary(content: string): Promise<string> {
    if (!this.settings.openAIApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const payload = {
      model: this.settings.openAIModel,
      messages: [this.systemPrompt, { role: "user", content: content }],
      temperature: 0.7,
      max_tokens: 500,
    };

    const response = await requestUrl({
      url: "https://api.openai.com/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.settings.openAIApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.status !== 200) {
      throw new Error(`OpenAI API request failed: ${response.status}`);
    }

    const data = response.json;
    return data.choices[0].message.content;
  }

  /**
   * Generate summary using Ollama
   */
  private async generateOllamaSummary(content: string): Promise<string> {
    // Check if Ollama is running
    const isHealthy = await this.checkOllamaHealth();
    if (!isHealthy) {
      throw new Error(
        "Ollama server is not accessible. Please start Ollama first."
      );
    }

    const payload = {
      model: this.settings.ollamaModel,
      messages: [this.systemPrompt, { role: "user", content: content }],
      stream: false,
    };

    const response = await requestUrl({
      url: `${this.settings.ollamaUrl}/api/chat`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.status !== 200) {
      throw new Error(`Ollama API request failed: ${response.status}`);
    }

    const data = response.json;
    return data.message.content;
  }

  /**
   * Generate summary for a conversation
   */
  async generateSummary(
    content: string,
    conversationId: string,
    filename: string
  ): Promise<SummaryResponse> {
    try {
      let summary: string;
      let llmUsed: string;

      if (this.settings.useOpenAI) {
        summary = await this.generateOpenAISummary(content);
        llmUsed = `OpenAI ${this.settings.openAIModel}`;
      } else {
        summary = await this.generateOllamaSummary(content);
        llmUsed = `Ollama ${this.settings.ollamaModel}`;
      }

      return {
        summary,
        conversationId,
        filename,
      };
    } catch (error) {
      console.error("Error generating summary:", error);
      throw error;
    }
  }

  /**
   * Process multiple conversations and generate summaries
   */
  async generateSummaries(
    conversations: Array<{ header: string; content: string; filename: string }>,
    onProgress?: (current: number, total: number) => void
  ): Promise<SummaryResponse[]> {
    const results: SummaryResponse[] = [];
    let processedCount = 0;

    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i];

      // Skip if content is too short
      if (conv.content.length < 50) {
        continue;
      }

      processedCount++;

      // Update progress
      if (onProgress) {
        onProgress(processedCount, conversations.length);
      }

      try {
        const summary = await this.generateSummary(
          conv.content,
          `conversation_${i + 1}`,
          conv.filename
        );
        results.push(summary);
      } catch (error) {
        console.error(
          `Failed to generate summary for conversation ${i + 1}:`,
          error
        );
        // Continue with other conversations
      }
    }

    return results;
  }
}
