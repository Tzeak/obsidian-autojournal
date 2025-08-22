# Installation Guide

## Quick Setup

### 1. Copy Plugin to Obsidian

Copy the entire `obsidian_autojournal` folder to your Obsidian vault's plugins directory:

```bash
cp -r /Users/babydeepthought/Documents/garbage/obsidian_autojournal /path/to/your/vault/.obsidian/plugins/auto-journal
```

Or manually:

1. Navigate to your vault folder
2. Open `.obsidian/plugins/` (create if it doesn't exist)
3. Copy this entire plugin folder as `auto-journal`

### 2. Enable the Plugin

1. Open Obsidian
2. Go to Settings → Community Plugins
3. Disable "Safe mode" if it's enabled
4. Find "Auto Journal" in the list and enable it

### 3. Configure Settings

1. Go to Settings → Auto Journal
2. Set up your paths and preferences:
   - **Contacts file path**: Point to your exported contacts file (e.g., `Assets/contacts.vcf`)
   - **Output folder**: Where you want journal entries (e.g., `Journal`) - **iMessage Exporter Path**: Usually `/opt/homebrew/bin/imessage-exporter` (use "Detect Path" button in settings)

### 4. Install Prerequisites

```bash
# Install iMessage exporter
brew install imessage-exporter

# For AI summaries, choose one:

# Option A: Ollama (free, local)
brew install ollama
ollama serve
ollama pull llama3.2

# Option B: OpenAI (paid, cloud)
# Just get an API key from https://platform.openai.com/api-keys
```

### 5. Export Your Contacts

1. Open Contacts app on macOS
2. File → Export → Export vCard
3. Save to your vault (e.g., `Autojournal/contacts.vcf`)

## Testing the Plugin

### Test 1: Basic Plugin Load

1. Open Obsidian command palette (Cmd/Ctrl + P)
2. Look for "Auto Journal" commands
3. You should see commands like "Import Yesterday's Messages"

### Test 2: Contact Loading

1. Use command "Auto Journal: Reload Contacts"
2. Check the console (Cmd/Ctrl + Shift + I) for any errors
3. Should see a "Contacts loaded successfully" notice

### Test 3: Message Processing (Automated)

Test the new automated workflow:

1. Run "Auto Journal: Import Yesterday's Messages"
2. Check that the command was copied to clipboard
3. Paste and run the command in terminal
4. Run "Auto Journal: Process Exported Files"
5. Check that a journal entry is created and opens automatically

### Test 4: Manual Processing (Fallback)

If you have existing message exports:

1. Copy the existing `converted_messages.txt` from the original auto-journal project
2. Place it in your vault
3. Run "Auto Journal: Process Existing Message File"
4. Check if a journal entry is created in your output folder

## File Structure After Installation

Your vault should look like this:

```
your-vault/
├── .obsidian/
│   └── plugins/
│       └── auto-journal/
│           ├── main.js
│           ├── manifest.json
│           ├── package.json
│           └── src/ (TypeScript source files)
├── Autojournal/
│   └── contacts.vcf (your exported contacts)
└── Autojournal/ (or your chosen output folder)
    └── Daily Journal YYYY-MM-DD.md (generated entries)
```

## Troubleshooting

### Common Issues

1. **Plugin not appearing in settings**

   - Make sure the folder is named exactly `auto-journal`
   - Check that `manifest.json` and `main.js` are present
   - Restart Obsidian

2. **"Contacts file not found" error**

   - Verify the path in settings matches your actual file location
   - Make sure the file is `.vcf` or `.csv` format

3. **Commands not working**

   - Check the console for JavaScript errors
   - Make sure you have the required dependencies installed

4. **AI summaries not working**
   - For Ollama: Check that `ollama serve` is running
   - For OpenAI: Verify your API key is correct
   - Check network connectivity

### Development Mode

If you want to modify the plugin:

```bash
cd /path/to/vault/.obsidian/plugins/auto-journal
npm install
npm run dev  # Starts development mode with hot reload
```

## Support

If you encounter issues:

1. Check the console for error messages (Cmd/Ctrl + Shift + I)
2. Verify all prerequisites are installed correctly
3. Test with a simple contact file first
4. Check the original Python scripts work independently
