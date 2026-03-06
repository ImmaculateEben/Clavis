"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: string;
  type: string;
  text: string;
  options: string[];
  points: number;
  order_number: number;
}

interface Attempt {
  id: string;
  exam_id: string;
  started_at: string;
  status: string;
}

interface ExamData {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
}

export default function TakeExamPage() {
  const params = useParams();
  const examId = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [exam, setExam] = useState<ExamData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Load exam data
  useEffect(() => {
    const loadExam = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Get exam
      const { data: examData } = await supabase
        .from("exams")
        .select("*")
        .eq("id", examId)
        .single();

      if (!examData || examData.status !== "active") {
        toast.error("Exam not available");
        router.push("/exam/join");
        return;
      }

      setExam(examData);

      // Get attempt
      const { data: attemptData } = await supabase
        .from("exam_attempts")
        .select("*")
        .eq("exam_id", examId)
        .eq("student_id", user.id)
        .single();

      if (!attemptData || attemptData.status !== "in_progress") {
        toast.error("No active attempt found");
        router.push("/exam/join");
        return;
      }

      setAttempt(attemptData);

      // Calculate time remaining
      const startTime = new Date(attemptData.started_at).getTime();
      const endTime = startTime + examData.duration_minutes * 60 * 1000;
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));

      if (remaining <= 0) {
        toast.error("Time is up!");
        await autoSubmit(attemptData.id);
        return;
      }

      setTimeLeft(remaining);

      // Get questions through RPC so correct answers are never exposed during an active attempt
      const { data: questionsData, error: questionsError } = await supabase.rpc(
        "get_attempt_questions",
        { attempt_uuid: attemptData.id }
      );

      if (questionsError) {
        toast.error("Failed to load exam questions");
        router.push("/exam/join");
        return;
      }

      const normalizedQuestions =
        questionsData?.map((q: any) => ({
          ...q,
          options: Array.isArray(q.options)
            ? q.options.map((option: unknown) => String(option))
            : [],
        })) || [];

      setQuestions(normalizedQuestions);

      // Load existing answers
      const { data: existingAnswers } = await supabase
        .from("answers")
        .select("question_id, selected_answer")
        .eq("attempt_id", attemptData.id);

      if (existingAnswers) {
        const answersMap: Record<string, string> = {};
        existingAnswers.forEach((a) => {
          if (a.selected_answer) {
            answersMap[a.question_id] = a.selected_answer;
          }
        });
        setAnswers(answersMap);
      }

      setLoading(false);
    };

    loadExam();
  }, [examId]);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0 || loading) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, loading]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const autoSubmit = async (attemptId: string) => {
    const { error } = await supabase.rpc("grade_attempt", {
      attempt_uuid: attemptId,
    });

    if (!error) {
      router.push(`/exam/${examId}/result?attempt=${attemptId}`);
    }
  };

  const handleAutoSubmit = async () => {
    if (!attempt) return;
    toast.error("Time is up! Submitting your exam...");
    await saveCurrentAnswer();
    await autoSubmit(attempt.id);
  };

  const saveCurrentAnswer = useCallback(async () => {
    if (!attempt || !questions[currentIndex]) return;

    const questionId = questions[currentIndex].id;
    const answer = answers[questionId];

    if (!answer) return;

    // Upsert answer
    await supabase.from("answers").upsert(
      {
        attempt_id: attempt.id,
        question_id: questionId,
        selected_answer: answer,
      },
      { onConflict: "attempt_id,question_id" }
    );
  }, [attempt, questions, currentIndex, answers]);

  const selectAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const goToQuestion = async (index: number) => {
    await saveCurrentAnswer();
    setCurrentIndex(index);
  };

  const handleSubmit = async () => {
    if (!attempt) return;
    setSubmitting(true);

    try {
      // Save all answers
      for (const question of questions) {
        const answer = answers[question.id];
        if (answer) {
          await supabase.from("answers").upsert(
            {
              attempt_id: attempt.id,
              question_id: question.id,
              selected_answer: answer,
            },
            { onConflict: "attempt_id,question_id" }
          );
        }
      }

      // Grade the attempt
      const { error } = await supabase.rpc("grade_attempt", {
        attempt_uuid: attempt.id,
      });

      if (error) throw error;

      toast.success("Exam submitted successfully!");
      router.push(`/exam/${examId}/result?attempt=${attempt.id}`);
    } catch {
      toast.error("Failed to submit. Try again.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-semibold text-gray-900 truncate">
            {exam?.title}
          </h1>
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-sm font-bold ${
              timeLeft < 60
                ? "bg-red-100 text-red-700 animate-pulse"
                : timeLeft < 300
                ? "bg-amber-100 text-amber-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            <Clock className="h-4 w-4" />
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigation */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-white rounded-xl border p-4 sticky top-20">
              <h3 className="text-sm font-medium text-gray-500 mb-3">
                Questions ({answeredCount}/{questions.length})
              </h3>
              <div className="grid grid-cols-5 lg:grid-cols-4 gap-2">
                {questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => goToQuestion(idx)}
                    className={`h-9 w-9 rounded-lg text-sm font-medium transition ${
                      idx === currentIndex
                        ? "bg-indigo-600 text-white"
                        : answers[q.id]
                        ? "bg-green-100 text-green-700 border border-green-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={submitting}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  Submit Exam
                </button>
              </div>
            </div>
          </div>

          {/* Current Question */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            {currentQuestion && (
              <div className="bg-white rounded-xl border p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-500">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <span className="text-sm text-gray-500">
                    {currentQuestion.points} point
                    {currentQuestion.points !== 1 ? "s" : ""}
                  </span>
                </div>

                <h2 className="text-lg font-medium text-gray-900 mb-6">
                  {currentQuestion.text}
                </h2>

                <div className="space-y-3">
                  {(currentQuestion.options as string[]).map(
                    (option, oIdx) => (
                      <button
                        key={oIdx}
                        onClick={() =>
                          selectAnswer(currentQuestion.id, option)
                        }
                        className={`w-full text-left px-4 py-3 rounded-lg border-2 transition ${
                          answers[currentQuestion.id] === option
                            ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              answers[currentQuestion.id] === option
                                ? "border-indigo-600 bg-indigo-600"
                                : "border-gray-300"
                            }`}
                          >
                            {answers[currentQuestion.id] === option && (
                              <div className="h-2 w-2 rounded-full bg-white" />
                            )}
                          </div>
                          <span className="text-sm font-medium">{option}</span>
                        </div>
                      </button>
                    )
                  )}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-4 border-t">
                  <button
                    onClick={() => goToQuestion(currentIndex - 1)}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  {currentIndex < questions.length - 1 ? (
                    <button
                      onClick={() => goToQuestion(currentIndex + 1)}
                      className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowConfirm(true)}
                      className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
                    >
                      Finish Exam
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Submit Exam?
              </h3>
            </div>
            <p className="text-gray-600 mb-2">
              You have answered{" "}
              <span className="font-semibold">{answeredCount}</span> out of{" "}
              <span className="font-semibold">{questions.length}</span>{" "}
              questions.
            </p>
            {answeredCount < questions.length && (
              <p className="text-amber-600 text-sm mb-4">
                Warning: {questions.length - answeredCount} question(s)
                unanswered!
              </p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Review Answers
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
