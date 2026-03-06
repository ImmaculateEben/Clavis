"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function JoinExamPage() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if user is logged in
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please sign in first");
        router.push("/auth/login");
        return;
      }

      // Find exam by PIN
      const { data: exam, error } = await supabase
        .from("exams")
        .select("id, title, status, duration_minutes")
        .eq("pin", pin.trim())
        .single();

      if (error || !exam) {
        toast.error("Invalid PIN. Please check and try again.");
        setLoading(false);
        return;
      }

      if (exam.status !== "active") {
        toast.error(
          exam.status === "draft"
            ? "This exam is not yet active."
            : "This exam has been closed."
        );
        setLoading(false);
        return;
      }

      // Check for existing attempt
      const { data: existingAttempt } = await supabase
        .from("exam_attempts")
        .select("id, status")
        .eq("exam_id", exam.id)
        .eq("student_id", user.id)
        .single();

      if (existingAttempt) {
        if (existingAttempt.status === "completed") {
          toast.error("You have already completed this exam.");
          router.push(
            `/exam/${exam.id}/result?attempt=${existingAttempt.id}`
          );
          setLoading(false);
          return;
        }
        // Resume in-progress attempt
        router.push(`/exam/${exam.id}`);
        return;
      }

      // Create new attempt
      const { data: attempt, error: attemptError } = await supabase
        .from("exam_attempts")
        .insert({
          exam_id: exam.id,
          student_id: user.id,
        })
        .select()
        .single();

      if (attemptError) {
        toast.error("Failed to start exam. Try again.");
        setLoading(false);
        return;
      }

      toast.success(`Starting: ${exam.title}`);
      router.push(`/exam/${exam.id}`);
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <KeyRound className="h-8 w-8 text-indigo-600" />
            <span className="text-2xl font-bold text-gray-900">Clavis</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Enter Exam PIN</h1>
          <p className="text-gray-600 mt-1">
            Enter the 6-digit PIN provided by your teacher
          </p>
        </div>

        <form
          onSubmit={handleJoin}
          className="bg-white rounded-xl border shadow-sm p-6 space-y-4"
        >
          <div>
            <label
              htmlFor="pin"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Exam PIN
            </label>
            <input
              id="pin"
              type="text"
              required
              maxLength={6}
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="w-full px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              placeholder="000000"
            />
          </div>

          <button
            type="submit"
            disabled={loading || pin.length !== 6}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                Start Exam
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-4 text-sm text-gray-500">
          Don&apos;t have a PIN? Ask your teacher for the exam access code.
        </p>
      </div>
    </div>
  );
}
