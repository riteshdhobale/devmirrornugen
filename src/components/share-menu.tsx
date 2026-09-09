import { useState } from "react";
import { Check, Link2, Linkedin, Share2, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface ShareMenuProps {
  /** Absolute or relative URL to share — relative is resolved against the current origin. */
  url: string;
  /** Text used in social posts. */
  text: string;
  /** Small label shown on the trigger button. */
  label?: string;
}

function absoluteUrl(url: string) {
  if (url.startsWith("http")) return url;
  if (typeof window === "undefined") return url;
  return `${window.location.origin}${url.startsWith("/") ? url : `/${url}`}`;
}

function openShare(href: string) {
  window.open(href, "_blank", "noopener,noreferrer,width=640,height=560");
}

export function ShareMenu({ url, text, label = "Share" }: ShareMenuProps) {
  const [copied, setCopied] = useState(false);
  const fullUrl = absoluteUrl(url);
  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedText = encodeURIComponent(text);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
    } catch {
      // Clipboard API unavailable (permissions / non-secure context) — fallback
      const el = document.createElement("textarea");
      el.value = fullUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(true);
    toast.success("Link copied — anyone who opens it sees this exact view.");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Share2 className="size-4" /> {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
          Transmit this universe
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={copyLink}>
          {copied ? <Check className="size-4 text-success" /> : <Link2 className="size-4" />}
          {copied ? "Copied" : "Copy link"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => openShare(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`)}
        >
          <Twitter className="size-4" /> Share on X / Twitter
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            openShare(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`)
          }
        >
          <Linkedin className="size-4" /> Share on LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => openShare(`https://wa.me/?text=${encodedText}%20${encodedUrl}`)}
        >
          <Share2 className="size-4" /> Share on WhatsApp
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
