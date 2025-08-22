# Auto Journal - Obsidian Plugin
## This Readme is written by a robot. leaving for use with other robots.

Automatically import and summarize iMessage conversations as journal entries in Obsidian.

## Features

- 📱 **iMessage Integration**: Export messages directly from macOS using `imessage-exporter`
- 👤 **Contact Management**: Replace phone numbers and emails with readable contact names
- 🤖 **AI Summaries**: Generate conversation summaries using OpenAI GPT or local Ollama
- 📅 **Automated Journaling**: Create daily journal entries from your conversations
- ⚡ **Auto-import**: Optionally run imports automatically at regular intervals
- 🎯 **Smart Processing**: Filter out short conversations and focus on meaningful exchanges

## Prerequisites

### 1. Install iMessage Exporter

```bash
brew install imessage-exporter
```

### 2. Set up AI Service (Choose one)

#### Option A: Ollama (Local, Free)

```bash
# Install Ollama
brew install ollama

# Start Ollama service
ollama serve

# Pull a model (e.g., llama3.2)
ollama pull llama3.2
```

#### Option B: OpenAI (Cloud, Paid)

- Get an API key from [OpenAI](https://platform.openai.com/api-keys)
- Choose from models: GPT-3.5 Turbo, GPT-4, GPT-4 Turbo, or GPT-4o

### 3. Export Your Contacts

Export your contacts to a VCF or CSV file and place it in your vault:

- On macOS: Contacts app → File → Export → Export vCard
- From Google Contacts: Export as CSV
- Use any other contact export tool

**Automatic Loading**: The plugin will automatically find and load contacts from:

1. The configured contacts path in settings (defaults to `Autojournal/contacts.vcf`)
2. The default location (`Autojournal/contacts.vcf`) if no path is configured
3. The default CSV location (`Autojournal/contacts.csv`) if no path is configured

**Note**: You can change the folder names in the plugin settings. "Autojournal" is just the default.

## Installation

### From Obsidian Community Plugins

1. Open Obsidian Settings
2. Go to Community Plugins → Browse
3. Search for "Auto Journal"
4. Install and enable the plugin

### Manual Installation

1. Download the latest release
2. Extract to your vault's `.obsidian/plugins/auto-journal/` folder
3. Enable the plugin in Obsidian settings

### Development Installation

1. Clone this repository to your vault's plugins folder:

   ```bash
   cd /path/to/your/vault/.obsidian/plugins/
   git clone https://github.com/yourusername/obsidian-auto-journal auto-journal
   cd auto-journal
   ```

2. Install dependencies and build:

   ```bash
   npm install
   npm run build
   ```

3. Enable the plugin in Obsidian settings

## Configuration

1. Open Obsidian Settings → Auto Journal
2. Configure the following:
   - **Contacts file path**: Path to your `.vcf` or `.csv` contacts file (defaults to `Autojournal/contacts.vcf`)
   - **Output folder**: Where journal entries should be created (e.g., "Autojournal")
   - **Filename template**: Template for journal filenames (defaults to "Daily Journal {date}")
   - **Heading template**: Template for journal headings (defaults to "# Daily Journal - {date}")
   - **iMessage Exporter Path**: Full path to the `imessage-exporter` binary - **AI Service**: Choose between OpenAI or Ollama - **Model Selection**: Pick specific models (GPT-3.5, GPT-4, Llama 3.2, Mistral, etc.)
     - **API Keys**: Securely store your OpenAI API key in the plugin
     - **Progress Indicators**: See real-time progress during file processing and summary generation
     - **Auto Import**: Enable automatic imports at regular intervals

## Usage

### Manual Import

1. Use the command palette (Cmd/Ctrl + P)
2. Run "Auto Journal: Import Yesterday's Messages"
3. The plugin will copy the export command to your clipboard
4. Paste and run the command in terminal
5. Run "Auto Journal: Process Exported Files" to create your daily summary
6. Or click the calendar icon in the ribbon for quick access

### Auto Import

1. Enable "Auto Import" in settings
2. Set your preferred interval (15 minutes to 24 hours)
3. The plugin will automatically process new messages

### Processing Existing Files

If you have existing message exports:

1. Run "Auto Journal: Process Existing Message File"
2. The plugin will find and process compatible files

### Automated Workflow

The plugin now provides a streamlined workflow:

1. **Export**: Run "Import Yesterday's Messages" → vault-specific command copied to clipboard
2. **Execute**: Navigate to your vault directory in terminal, then paste and run the command
3. **Process**: Run "Process Exported Files" → automatic daily summary creation
4. **Review**: Journal entry opens automatically for review

This eliminates the need for manual file handling and creates a seamless experience. The export command includes your vault name and creates files directly in your configured output folder.

## How It Works

1. **Export**: Uses `imessage-exporter` to export conversations from your Mac
2. **Contact Resolution**: Replaces phone numbers and email addresses with contact names from your address book (including conversation headers and group chat naming, while preserving existing meaningful names)
3. **AI Processing**: Sends conversations to your chosen AI service for summarization
4. **Journal Creation**: Generates a daily journal entry with conversation summaries and LLM identification

### Date Handling

The plugin uses consistent date formatting throughout:

- **Export dates**: YYYY-MM-DD format (e.g., "2024-08-21")
- **Directory names**: MM_DD format (e.g., "08_21")
- **Journal files**: Named with the target date (e.g., "Daily Journal 2024-08-21.md")
- **Generated timestamp**: Shows when the journal was created (not the target date)

**Important**: The directory name matches the date of the messages being exported. For example:

- "Import Yesterday's Messages" exports messages from yesterday into a directory named for yesterday's date
- The date range is inclusive start, exclusive end (e.g., 2024-08-21 to 2024-08-22 exports messages from August 21st)

### Filename Templates

You can customize the filename format for your journal entries:

- **Default**: `Daily Journal {date}` → `Daily Journal 2024-08-21.md`
- **Custom examples**:
  - `Journal {date}` → `Journal 2024-08-21.md`
  - `My Day {date}` → `My Day 2024-08-21.md`
  - `Conversations {date}` → `Conversations 2024-08-21.md`

### Heading Templates

You can customize or remove the heading of your journal entries:

- **Default**: `# Daily Journal - {date}` → `# Daily Journal - 2024-08-21`
- **Custom examples**:
  - `## {date}` → `## 2024-08-21`
  - `# My Day - {date}` → `# My Day - 2024-08-21`
  - `# Conversations {date}` → `# Conversations 2024-08-21`
  - **Empty**: Remove heading entirely

## File Structure

The plugin creates journal entries in this format (customizable filename):

```markdown
# Daily Journal - 2024-04-15

Generated on 4/15/2024, 9:30:00 AM
AI Summaries: Ollama llama3.2

## Conversations Summary

Total conversations: 3

### John Smith

You discussed weekend plans with John Smith and decided to meet for coffee on Saturday.

---

### John Smith, Jane Doe, Mike Johnson

You had a brief check-in with Work Team about the project deadline and confirmed the deliverables.

---
```

## Privacy & Security

- **Local Processing**: When using Ollama, all AI processing happens locally on your machine
- **Data Control**: Your messages never leave your device except when using OpenAI (if configured)
- **Contact Protection**: Contact names are formatted with special brackets to maintain privacy in AI processing

## Troubleshooting

### Common Issues

1. **"imessage-exporter not found"**

   - Ensure `imessage-exporter` is installed: `brew install imessage-exporter`
   - Find the correct path: `which imessage-exporter` in terminal
   - Update the path in plugin settings (use "Detect Path" button)
   - Common paths: `/opt/homebrew/bin/imessage-exporter` (Apple Silicon) or `/usr/local/bin/imessage-exporter` (Intel)

2. **"Ollama server not accessible"**

   - Make sure Ollama is running: `ollama serve`
   - Check that the URL in settings matches your Ollama installation

3. **"No conversations found"**

   - Ensure you have iMessage conversations for the selected date
   - Check that the exported files are in the correct format

4. **Contact replacement not working**
   - Verify your contacts file path is correct
   - Ensure the contacts file is in VCF or CSV format
   - Try reloading contacts with the "Reload Contacts" command

### Debug Mode

Enable debug mode by opening the developer console (Cmd/Ctrl + Shift + I) and checking for error messages.

## Development

### Building from Source

```bash
npm install
npm run dev    # Development mode with hot reload
npm run build  # Production build
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 🐛 [Report bugs](https://github.com/yourusername/obsidian-auto-journal/issues)
- 💡 [Request features](https://github.com/yourusername/obsidian-auto-journal/issues)
- 📖 [Documentation](https://github.com/yourusername/obsidian-auto-journal/wiki)

## Changelog

### v1.0.0

- Initial release
- iMessage export integration
- Contact name replacement
- AI summarization with OpenAI and Ollama support
- Auto-import functionality
- Configurable settings
