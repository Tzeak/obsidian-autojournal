import { App, Modal, Setting, Notice } from "obsidian";

export interface DateRangeResult {
  startDate: string;
  endDate: string;
  singleDate: boolean;
}

export class DateRangeModal extends Modal {
  private result: DateRangeResult | null = null;
  private onSubmit: (result: DateRangeResult | null) => void;
  private singleDateMode: boolean = true;
  private startDate: string;
  private endDate: string;

  constructor(app: App, onSubmit: (result: DateRangeResult | null) => void) {
    super(app);
    this.onSubmit = onSubmit;
    
    // Default to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    this.startDate = this.formatDate(yesterday);
    this.endDate = this.startDate;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("date-range-modal");

    contentEl.createEl("h2", { text: "Select Date Range" });
    contentEl.createEl("p", { 
      text: "Choose the dates for iMessage export", 
      cls: "setting-item-description" 
    });

    // Single date / Date range toggle
    new Setting(contentEl)
      .setName("Date selection mode")
      .setDesc("Choose between a single date or a date range")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("single", "Single Date")
          .addOption("range", "Date Range")
          .setValue(this.singleDateMode ? "single" : "range")
          .onChange((value) => {
            this.singleDateMode = value === "single";
            if (this.singleDateMode) {
              this.endDate = this.startDate;
            }
            this.refreshDisplay();
          })
      );

    // Start date picker
    const startDateSetting = new Setting(contentEl)
      .setName(this.singleDateMode ? "Date" : "Start Date")
      .setDesc(this.singleDateMode 
        ? "Select the date to export messages from" 
        : "Select the start date for the range (inclusive)");

    const startDateInput = startDateSetting.controlEl.createEl("input", {
      type: "date",
      value: this.startDate,
    });
    startDateInput.addClass("date-input");
    startDateInput.addEventListener("change", (e) => {
      this.startDate = (e.target as HTMLInputElement).value;
      if (this.singleDateMode) {
        this.endDate = this.startDate;
      } else if (this.endDate < this.startDate) {
        this.endDate = this.startDate;
        // Update end date input if it exists
        const endInput = contentEl.querySelector(".end-date-input") as HTMLInputElement;
        if (endInput) {
          endInput.value = this.endDate;
        }
      }
    });

    // End date picker (only shown in range mode)
    if (!this.singleDateMode) {
      const endDateSetting = new Setting(contentEl)
        .setName("End Date")
        .setDesc("Select the end date for the range (inclusive)");

      const endDateInput = endDateSetting.controlEl.createEl("input", {
        type: "date",
        value: this.endDate,
      });
      endDateInput.addClass("date-input", "end-date-input");
      endDateInput.addEventListener("change", (e) => {
        const newEndDate = (e.target as HTMLInputElement).value;
        if (newEndDate >= this.startDate) {
          this.endDate = newEndDate;
        } else {
          new Notice("End date cannot be before start date");
          (e.target as HTMLInputElement).value = this.endDate;
        }
      });
    }

    // Quick select buttons
    contentEl.createEl("h4", { text: "Quick Select" });
    const quickSelectDiv = contentEl.createDiv({ cls: "quick-select-buttons" });

    const quickSelectOptions = [
      { label: "Yesterday", days: 1 },
      { label: "Last 3 days", days: 3 },
      { label: "Last week", days: 7 },
      { label: "Last 2 weeks", days: 14 },
      { label: "Last month", days: 30 },
    ];

    for (const option of quickSelectOptions) {
      const btn = quickSelectDiv.createEl("button", {
        text: option.label,
        cls: "quick-select-btn",
      });
      btn.addEventListener("click", () => {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - 1); // Yesterday
        const startDate = new Date(endDate);
        
        if (option.days === 1) {
          // Single day (yesterday)
          this.singleDateMode = true;
          this.startDate = this.formatDate(endDate);
          this.endDate = this.startDate;
        } else {
          // Date range
          this.singleDateMode = false;
          startDate.setDate(endDate.getDate() - option.days + 1);
          this.startDate = this.formatDate(startDate);
          this.endDate = this.formatDate(endDate);
        }
        this.refreshDisplay();
      });
    }

    // Action buttons
    const buttonDiv = contentEl.createDiv({ cls: "modal-button-container" });
    
    const cancelBtn = buttonDiv.createEl("button", {
      text: "Cancel",
      cls: "mod-secondary",
    });
    cancelBtn.addEventListener("click", () => {
      this.result = null;
      this.close();
    });

    const submitBtn = buttonDiv.createEl("button", {
      text: "Export Messages",
      cls: "mod-cta",
    });
    submitBtn.addEventListener("click", () => {
      this.result = {
        startDate: this.startDate,
        endDate: this.endDate,
        singleDate: this.singleDateMode,
      };
      this.close();
    });

    // Add some custom styles
    this.addStyles();
  }

  private refreshDisplay() {
    this.onOpen();
  }

  private addStyles() {
    const styleEl = document.createElement("style");
    styleEl.id = "date-range-modal-styles";
    
    // Remove existing styles if present
    const existing = document.getElementById("date-range-modal-styles");
    if (existing) {
      existing.remove();
    }

    styleEl.textContent = `
      .date-range-modal {
        padding: 20px;
      }
      .date-range-modal h2 {
        margin-bottom: 8px;
      }
      .date-range-modal .date-input {
        padding: 8px 12px;
        border-radius: 4px;
        border: 1px solid var(--background-modifier-border);
        background-color: var(--background-primary);
        color: var(--text-normal);
        font-size: 14px;
        min-width: 150px;
      }
      .date-range-modal .date-input:focus {
        border-color: var(--interactive-accent);
        outline: none;
      }
      .date-range-modal .quick-select-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 20px;
      }
      .date-range-modal .quick-select-btn {
        padding: 6px 12px;
        border-radius: 4px;
        border: 1px solid var(--background-modifier-border);
        background-color: var(--background-secondary);
        color: var(--text-normal);
        cursor: pointer;
        font-size: 12px;
      }
      .date-range-modal .quick-select-btn:hover {
        background-color: var(--background-modifier-hover);
      }
      .date-range-modal .modal-button-container {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
        padding-top: 15px;
        border-top: 1px solid var(--background-modifier-border);
      }
    `;
    document.head.appendChild(styleEl);
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    this.onSubmit(this.result);
  }
}
