import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import Input from "./Input";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  error?: string;
  hint?: string;
  showIcon?: boolean;
};

export default function PasswordInput({
  label = "Password",
  error,
  hint,
  showIcon = true,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      {...props}
      label={label}
      error={error}
      hint={hint}
      type={visible ? "text" : "password"}
      leftIcon={showIcon ? <Lock className="h-4 w-4" /> : undefined}
      rightElement={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-900/5 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
    />
  );
}
