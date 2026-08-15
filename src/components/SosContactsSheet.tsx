import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Plus, X, Contact } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { type SosRecipient } from "@/lib/sosRecipients";
import { isContactPickerSupported, pickContacts } from "@/lib/contactPicker";

interface SosContactsSheetProps {
  open: boolean;
  /** Contacts to pre-fill (e.g. remembered from a previous ride). */
  initialContacts: SosRecipient[];
  /** Disable the confirm action (e.g. while tracking is being initiated). */
  isSubmitting?: boolean;
  /** Called with the confirmed contacts to continue the share flow. */
  onConfirm: (contacts: SosRecipient[]) => void;
  /** Called when the rider dismisses the sheet without sharing. */
  onCancel: () => void;
}

const emptyContact: SosRecipient = { name: "", phone: "" };

/** De-duplicate by trimmed phone number, keeping the first occurrence. */
function dedupeByPhone(contacts: SosRecipient[]): SosRecipient[] {
  const seen = new Set<string>();
  const result: SosRecipient[] = [];
  for (const c of contacts) {
    const key = c.phone.trim();
    if (!key) {
      result.push(c);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(c);
  }
  return result;
}

/**
 * Guided step shown when the rider taps "Start Tracking": captures the emergency
 * contacts to alert on SOS (address-book picker where supported, typed entry
 * otherwise) before tracking begins. At least one contact with a phone number is
 * hard-required so an SOS can text them the tracking link.
 */
export function SosContactsSheet({
  open,
  initialContacts,
  isSubmitting = false,
  onConfirm,
  onCancel,
}: SosContactsSheetProps) {
  const [contacts, setContacts] = useState<SosRecipient[]>([emptyContact]);
  const pickerSupported = isContactPickerSupported();

  // Re-seed from remembered contacts each time the sheet is opened.
  useEffect(() => {
    if (open) {
      setContacts(
        initialContacts.length > 0 ? initialContacts : [emptyContact]
      );
    }
  }, [open, initialContacts]);

  const updateContact = (
    index: number,
    field: keyof SosRecipient,
    value: string
  ) => {
    setContacts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  const addContact = () =>
    setContacts((prev) => [...prev, { name: "", phone: "" }]);

  const removeContact = (index: number) =>
    setContacts((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index)
    );

  const handlePickFromContacts = async () => {
    const picked = await pickContacts();
    if (picked.length === 0) return;
    setContacts((prev) => {
      // Drop the initial empty placeholder, then merge + de-dupe.
      const existing = prev.filter((c) => c.phone.trim() || c.name?.trim());
      return dedupeByPhone([...existing, ...picked]);
    });
    toast({
      title: "Contacts added",
      description: `${picked.length} contact${
        picked.length === 1 ? "" : "s"
      } added from your address book.`,
    });
  };

  const validContacts = contacts.filter((c) => c.phone && c.phone.trim());
  const canConfirm = validContacts.length > 0 && !isSubmitting;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(validContacts);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isSubmitting) onCancel();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Emergency contacts
          </DialogTitle>
          <DialogDescription>
            Who should we alert if you trigger SOS during this ride? We&apos;ll
            text these people. At least one is required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {pickerSupported && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePickFromContacts}
              className="w-full gap-2"
            >
              <Contact className="h-4 w-4" />
              Choose from contacts
            </Button>
          )}

          <div className="space-y-2">
            {contacts.map((contact, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="Name (optional)"
                  value={contact.name ?? ""}
                  onChange={(e) => updateContact(index, "name", e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="tel"
                  inputMode="tel"
                  placeholder="Phone"
                  value={contact.phone}
                  onChange={(e) => updateContact(index, "phone", e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeContact(index)}
                  disabled={contacts.length === 1}
                  aria-label="Remove contact"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addContact}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Add another
          </Button>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!canConfirm}>
            {isSubmitting ? "Starting Tracking..." : "Continue & share"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SosContactsSheet;
