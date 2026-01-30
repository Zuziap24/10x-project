import { Button } from "./Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "./Dialog";
import { Input } from "./Input";

export function KitchenSinkDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="accent">Open Dialog</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Make changes to your profile here. Click save when you&apos;re done.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input label="Name" defaultValue="Pedro Duarte" />
          <Input label="Username" defaultValue="@peduarte" />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="subtle">Cancel</Button>
          </DialogClose>
          <Button variant="accent">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
