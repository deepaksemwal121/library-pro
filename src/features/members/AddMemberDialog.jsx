import * as Dialog from "@radix-ui/react-dialog";
import { UserPlus, X } from "lucide-react";

export const AddMemberDialog = ({ children }) => (
  <Dialog.Root>
    <Dialog.Trigger asChild>
      <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 sm:w-auto">
        <span>Register Member</span>
        <UserPlus size={20} />
      </button>
    </Dialog.Trigger>

    <Dialog.Portal>
      {/* Background Blur */}
      <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

      {/* Slide-over Panel */}
      <Dialog.Content className="fixed top-0 right-0 h-full w-full max-w-3xl bg-white p-4 shadow-xl overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right transition-transform duration-300 sm:p-6">
        <div className="flex justify-between items-center mb-6">
          <Dialog.Title className="text-xl font-bold">Register New Member</Dialog.Title>
          <Dialog.Close asChild>
            <button className="p-1 hover:bg-slate-100 rounded">
              <X size={20} />
            </button>
          </Dialog.Close>
        </div>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);
