import { Platform, Notice } from "obsidian";

export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
}

export class CommandExecutor {
  /**
   * Execute a shell command and return the result
   * This only works on desktop platforms (macOS, Windows, Linux)
   */
  async execute(command: string, args: string[] = []): Promise<CommandResult> {
    if (!Platform.isDesktop) {
      return {
        success: false,
        stdout: "",
        stderr: "",
        error: "Command execution is only available on desktop platforms",
      };
    }

    return new Promise((resolve) => {
      try {
        // Use Node.js child_process module (available in Electron)
        const { exec } = require("child_process");
        
        // Combine command and args into a single string
        const fullCommand = args.length > 0 
          ? `${command} ${args.join(" ")}` 
          : command;

        console.log(`Executing command: ${fullCommand}`);

        exec(
          fullCommand,
          { 
            maxBuffer: 1024 * 1024 * 10, // 10MB buffer for large outputs
            timeout: 300000, // 5 minute timeout
          },
          (error: any, stdout: string, stderr: string) => {
            if (error) {
              console.error("Command execution error:", error);
              resolve({
                success: false,
                stdout: stdout || "",
                stderr: stderr || "",
                error: error.message,
              });
            } else {
              console.log("Command executed successfully");
              resolve({
                success: true,
                stdout: stdout || "",
                stderr: stderr || "",
              });
            }
          }
        );
      } catch (err: any) {
        console.error("Failed to execute command:", err);
        resolve({
          success: false,
          stdout: "",
          stderr: "",
          error: err.message || "Unknown error occurred",
        });
      }
    });
  }

  /**
   * Execute the iMessage exporter with the given parameters
   */
  async executeImessageExporter(
    exporterPath: string,
    outputPath: string,
    startDate: string,
    endDate: string,
    onProgress?: (message: string) => void
  ): Promise<CommandResult> {
    if (!Platform.isDesktop) {
      return {
        success: false,
        stdout: "",
        stderr: "",
        error: "iMessage export is only available on desktop platforms (macOS)",
      };
    }

    // Check if the exporter exists
    const checkResult = await this.execute(`test -f "${exporterPath}" && echo "exists"`);
    if (!checkResult.stdout.includes("exists")) {
      return {
        success: false,
        stdout: "",
        stderr: "",
        error: `iMessage exporter not found at: ${exporterPath}. Please install it using 'brew install imessage-exporter' and verify the path in settings.`,
      };
    }

    if (onProgress) {
      onProgress("Starting iMessage export...");
    }

    // Build the command with proper escaping
    const command = `"${exporterPath}" -f txt -o "${outputPath}" -s "${startDate}" -e "${endDate}" -a macOS`;

    console.log(`Running iMessage exporter: ${command}`);

    const result = await this.execute(command);

    if (result.success) {
      if (onProgress) {
        onProgress("iMessage export completed successfully!");
      }
    } else {
      if (onProgress) {
        onProgress(`Export failed: ${result.error || result.stderr}`);
      }
    }

    return result;
  }

  /**
   * Check if imessage-exporter is installed and accessible
   */
  async checkImessageExporter(exporterPath: string): Promise<{ installed: boolean; version?: string; error?: string }> {
    if (!Platform.isDesktop) {
      return {
        installed: false,
        error: "Not running on desktop platform",
      };
    }

    // Try to get the version to verify it's working
    const result = await this.execute(`"${exporterPath}" --version`);

    if (result.success || result.stdout.includes("imessage-exporter")) {
      // Extract version if available
      const versionMatch = result.stdout.match(/\d+\.\d+\.\d+/);
      return {
        installed: true,
        version: versionMatch ? versionMatch[0] : "unknown",
      };
    }

    // Check common alternative paths
    const commonPaths = [
      "/opt/homebrew/bin/imessage-exporter",
      "/usr/local/bin/imessage-exporter",
      "/usr/bin/imessage-exporter",
    ];

    for (const path of commonPaths) {
      if (path !== exporterPath) {
        const altResult = await this.execute(`"${path}" --version`);
        if (altResult.success || altResult.stdout.includes("imessage-exporter")) {
          return {
            installed: true,
            version: "unknown",
            error: `Found at ${path} instead of configured path`,
          };
        }
      }
    }

    return {
      installed: false,
      error: result.error || result.stderr || "imessage-exporter not found",
    };
  }
}
