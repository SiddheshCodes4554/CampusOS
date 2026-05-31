import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-6 select-none fade-in-entry">
      <div className="glass-card max-w-md w-full p-8 flex flex-col items-center gap-6">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] bg-clip-text text-transparent">
          CampusOS
        </h1>
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
          The AI-powered operating system for college students. Streamline syllabus parsing, AI flashcard generation, study group matchmaking, and budget management.
        </p>
        <div className="flex gap-4 w-full">
          <Link href="/login" className="flex-1">
            <Button className="w-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-black font-semibold cursor-pointer">
              Launch App
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
