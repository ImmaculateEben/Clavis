import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Award,
  KeyRound,
} from "lucide-react";

export default async function ExamResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ attempt?: string }>;
}) {
  const { id } = await params;
  const { attempt: attemptId } = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Get the attempt
  let attemptQuery = supabase
    .from("exam_attempts")
    .select("*")
    .eq("exam_id", id)
    .eq("student_id", user.id)
    .eq("status", "completed");

  if (attemptId) {
    attemptQuery = attemptQuery.eq("id", attemptId);
  }

  const { data: attempt } = await attemptQuery.single();

  if (!attempt) notFound();

  // Get exam
  const { data: exam } = await supabase
    .from("exams")
    .select("*")
    .eq("id", id)
    .single();

  if (!exam) notFound();

  // Get questions and answers
  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("exam_id", id)
    .order("order_number");

  const { data: answers } = await supabase
    .from("answers")
    .select("*")
    .eq("attempt_id", attempt.id);

  const answerMap = new Map(
    answers?.map((a) => [a.question_id, a]) || []
  );

  const totalQuestions = questions?.length || 0;
  const correctAnswers =
    answers?.filter((a) => a.is_correct).length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-2">
          <KeyRound className="h-6 w-6 text-indigo-600" />
          <span className="text-lg font-bold text-gray-900">Clavis</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Score Card */}
        <div className="bg-white rounded-xl border p-8 text-center mb-8">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-indigo-100 mb-4">
            <Award className="h-10 w-10 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {exam.title}
          </h1>
          <p className="text-gray-500 mb-6">Exam Completed</p>

          <div className="inline-flex items-baseline gap-1 mb-4">
            <span
              className={`text-6xl font-bold ${
                Number(attempt.score) >= 50
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {attempt.score}
            </span>
            <span className="text-2xl text-gray-400">%</span>
          </div>

          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <span>
              {correctAnswers} / {totalQuestions} correct
            </span>
            <span>
              Completed:{" "}
              {attempt.completed_at
                ? new Date(attempt.completed_at).toLocaleString()
                : "—"}
            </span>
          </div>
        </div>

        {/* Answer Review */}
        {exam.show_results && (
          <div className="bg-white rounded-xl border">
            <div className="p-5 border-b">
              <h2 className="font-semibold text-gray-900">Answer Review</h2>
            </div>
            <div className="divide-y">
              {questions?.map((q, index) => {
                const answer = answerMap.get(q.id);
                const isCorrect = answer?.is_correct;
                const selectedAnswer = answer?.selected_answer;

                return (
                  <div key={q.id} className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-gray-400">
                            Q{index + 1}
                          </span>
                          <span className="text-sm text-gray-400">
                            ({q.points} pt{q.points !== 1 ? "s" : ""})
                          </span>
                        </div>
                        <p className="font-medium text-gray-900 mb-3">
                          {q.text}
                        </p>
                        <div className="space-y-1.5">
                          {(q.options as string[]).map(
                            (option: string, oIdx: number) => {
                              const isSelected = selectedAnswer === option;
                              const isCorrectOption =
                                q.correct_answer === option;

                              return (
                                <div
                                  key={oIdx}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                                    isCorrectOption
                                      ? "bg-green-50 text-green-700 border border-green-200"
                                      : isSelected && !isCorrect
                                      ? "bg-red-50 text-red-700 border border-red-200"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {isCorrectOption ? (
                                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                  ) : isSelected ? (
                                    <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                                  ) : (
                                    <div className="h-4 w-4 rounded-full border border-gray-300 flex-shrink-0" />
                                  )}
                                  {option}
                                  {isSelected && !isCorrectOption && (
                                    <span className="text-xs text-red-500 ml-auto">
                                      Your answer
                                    </span>
                                  )}
                                  {isCorrectOption && (
                                    <span className="text-xs text-green-500 ml-auto">
                                      Correct answer
                                    </span>
                                  )}
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
