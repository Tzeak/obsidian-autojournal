import { ContactMap } from "./types";
import { parsePhoneNumber, isValidPhoneNumber } from "libphonenumber-js";

export class ContactManager {
  private phoneMap: ContactMap = {};
  private emailMap: ContactMap = {};

  /**
   * Standardize phone number to multiple formats for matching
   */
  private standardizePhone(phone: string): string[] {
    try {
      // Remove any non-digit characters except +
      const cleanPhone = phone.replace(/[^\d+]/g, "");

      const standardFormats: string[] = [];

      // Try to parse as a valid phone number
      try {
        const parsed = parsePhoneNumber(cleanPhone, "US"); // Default to US
        if (parsed && parsed.isValid()) {
          const international = parsed.format("E.164");
          const national = parsed.formatNational().replace(/[^\d]/g, "");

          standardFormats.push(
            international,
            international.substring(1),
            national,
            parsed.format("NATIONAL").replace(/[^\d]/g, "")
          );
        }
      } catch (e) {
        // If parsing fails, use manual formatting
      }

      // Manual fallback formatting
      let workingPhone = cleanPhone;

      // For +15551234567 format, also try matching +5551234567
      if (workingPhone.startsWith("+1") && workingPhone.length === 12) {
        standardFormats.push(
          workingPhone,
          workingPhone.substring(1),
          workingPhone.substring(2),
          "+" + workingPhone.substring(2)
        );
      }
      // If phone starts with + and is 11 digits
      else if (workingPhone.startsWith("+") && workingPhone.length === 11) {
        const phoneWithCountry = "+1" + workingPhone.substring(1);
        standardFormats.push(
          workingPhone,
          workingPhone.substring(1),
          phoneWithCountry,
          phoneWithCountry.substring(1)
        );
      }
      // If number starts with 1 and is 11 digits, add +
      else if (workingPhone.startsWith("1") && workingPhone.length === 11) {
        workingPhone = "+" + workingPhone;
        standardFormats.push(workingPhone, workingPhone.substring(1));
      }
      // If number doesn't start with +, try adding it
      else if (!workingPhone.startsWith("+")) {
        if (workingPhone.length === 10) {
          workingPhone = "+1" + workingPhone;
        } else {
          workingPhone = "+" + workingPhone.replace(/^0+/, "");
        }
        standardFormats.push(workingPhone, workingPhone.substring(1));
      }

      // Add original format
      standardFormats.push(cleanPhone);

      // Remove duplicates
      return [...new Set(standardFormats)];
    } catch (e) {
      console.error("Error standardizing phone:", e);
      return [phone];
    }
  }

  /**
   * Load contacts from CSV content
   */
  loadContactsFromCsv(csvContent: string): void {
    this.phoneMap = {};
    this.emailMap = {};

    const lines = csvContent.split("\n");
    const headers = lines[0]?.split(",").map((h) => h.replace(/"/g, "").trim());

    if (!headers || headers.length < 2) {
      throw new Error("Invalid CSV format");
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(",").map((v) => v.replace(/"/g, "").trim());
      if (values.length < 2) continue;

      const contact = values[0];
      const name = values[1];

      if (!name || !contact) continue;

      // Check if it's an email or phone number
      if (contact.includes("@")) {
        // It's an email
        this.emailMap[contact.toLowerCase()] = name;
      } else {
        // It's a phone number
        const formats = this.standardizePhone(contact);
        for (const fmt of formats) {
          this.phoneMap[fmt] = name;
        }

        // Also store the original format
        const cleanPhone = contact.replace(/[^\d+]/g, "");
        this.phoneMap[cleanPhone] = name;
      }
    }
  }

  /**
   * Load contacts from VCF content
   */
  loadContactsFromVcf(vcfContent: string): void {
    const contacts: Array<{ name: string; contact: string }> = [];
    const lines = vcfContent.split("\n");
    let currentContact: { name?: string } = {};

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith("FN:")) {
        currentContact.name = trimmedLine.substring(3);
      } else if (trimmedLine.includes("TEL")) {
        const phone = trimmedLine.split(":").pop()?.replace(/\D/g, "") || "";
        if (currentContact.name && phone) {
          contacts.push({
            name: currentContact.name,
            contact: `+${phone}`,
          });
        }
      } else if (trimmedLine.includes("EMAIL")) {
        const email = trimmedLine.split(":").pop() || "";
        if (currentContact.name && email) {
          contacts.push({
            name: currentContact.name,
            contact: email,
          });
        }
      } else if (trimmedLine === "END:VCARD") {
        currentContact = {};
      }
    }

    // Convert to CSV format and load
    const csvContent =
      "Phone Number/Email,Name\n" +
      contacts.map((c) => `${c.contact},${c.name}`).join("\n");
    this.loadContactsFromCsv(csvContent);
  }

  /**
   * Replace phone numbers and emails in text with contact names
   */
  replaceContactsInText(text: string): string {
    let newContent = text;
    let replacements = 0;

    // Phone number patterns
    const phonePatterns = [
      /\+1\d{10}\b/g, // +15551234567 format
      /\+\d{11,}/g, // +14084766548 format
      /\+\d{10}/g, // +4084766548 format
      /\b\d{10}\b/g, // 10 digit numbers
      /\(\d{3}\)\s*\d{3}[-\s]?\d{4}/g, // (408) 476-6548 format
    ];

    // Email pattern
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

    // Replace phone numbers
    for (const pattern of phonePatterns) {
      newContent = newContent.replace(pattern, (match) => {
        const formats = this.standardizePhone(match);

        for (const fmt of formats) {
          if (this.phoneMap[fmt]) {
            replacements++;
            console.log(`Replaced phone ${match} with ${this.phoneMap[fmt]}`);
            return this.phoneMap[fmt];
          }
        }

        // Try the original format
        const cleanPhone = match.replace(/[^\d+]/g, "");
        if (this.phoneMap[cleanPhone]) {
          replacements++;
          console.log(
            `Replaced phone ${match} with ${this.phoneMap[cleanPhone]}`
          );
          return this.phoneMap[cleanPhone];
        }

        return match; // Return original if no match found
      });
    }

    // Replace emails
    newContent = newContent.replace(emailPattern, (match) => {
      const email = match.toLowerCase();
      if (this.emailMap[email]) {
        replacements++;
        console.log(`Replaced email ${match} with ${this.emailMap[email]}`);
        return this.emailMap[email];
      }
      return match;
    });

    if (replacements > 0) {
      console.log(`Contact replacement: ${replacements} replacements made`);
    }

    return newContent;
  }

  /**
   * Get contact name for a phone number or email
   */
  getContactName(contact: string): string | null {
    if (contact.includes("@")) {
      return this.emailMap[contact.toLowerCase()] || null;
    } else {
      const formats = this.standardizePhone(contact);
      for (const fmt of formats) {
        if (this.phoneMap[fmt]) {
          return this.phoneMap[fmt];
        }
      }
      const cleanPhone = contact.replace(/[^\d+]/g, "");
      return this.phoneMap[cleanPhone] || null;
    }
  }
}
