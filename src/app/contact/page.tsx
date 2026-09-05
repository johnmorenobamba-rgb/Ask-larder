import { LarderMark } from "@/components/shared/LarderMark";
import { ContactForm } from "@/components/marketing/ContactForm";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export const metadata = {
  title: "Contact",
};

// Block N4 — the real destination for both "Contact us" (header nav) and
// "Book a walkthrough" (final CTA), replacing the old mailto links.
export default function ContactPage() {
  return (
    <main className="flex flex-1 flex-col bg-parchment">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16 sm:px-10 md:px-16">
        <a href="/" className="mb-8 flex items-center gap-2">
          <LarderMark size={24} />
          <span className="font-display text-lg font-bold text-ink">Larder</span>
        </a>
        <h1 className="mb-2 font-display text-3xl font-bold text-ink">Book a walkthrough</h1>
        <p className="mb-8 font-sans text-ink/70">
          Tell us about your venue. We&apos;ll bring your own SOPs into it.
        </p>
        <ContactForm />
      </div>
      <SiteFooter />
    </main>
  );
}
