import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Hash,
  BarChart3,
  Users,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { CopyPinButton } from "@/components/copy-pin-button";
import { ExamStatusToggle } from "@/components/exam-status-toggle";

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: exam } = await supabase
    .from("exams")
    .select("*")
    .eq("id", id)
    .single();

  if (!exam) notFound();

  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("exam_id", id)
    .order("order_number");

  const { data: attempts } = await supabase
    .from("exam_attempts")
    .select("*, profiles(full_name)")
    .eq("exam_id", id)
    .order("created_at", { ascending: false });

  const totalPoints =
    questions?.reduce((sum, q) => sum + q.points, 0) || 0;

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Exam Header */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
            {exam.description && (
              <p className="text-gray-600 mt-1">{exam.description}</p>
            )}
          </div>
          <ExamStatusToggle examId={exam.id} currentStatus={exam.status} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Hash className="h-4 w-4" />
              <span className="text-xs font-medium">PIN</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-lg font-mono font-bold text-gray-900">
                {exam.pin}
              </span>
              <CopyPinButton pin={exam.pin} />
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">Duration</span>
            </div>
            <span className="text-lg font-bold text-gray-900">
              {exam.duration_minutes} min
            </span>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs font-medium">Questions</span>
            </div>
            <span className="text-lg font-bold text-gray-900">
              {questions?.length || 0}
            </span>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Attempts</span>
            </div>
            <span className="text-lg font-bold text-gray-900">
              {attempts?.length || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Questions Preview */}
      <div className="bg-white rounded-xl border mb-6">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            Questions ({questions?.length || 0})
          </h2>
          <span className="text-sm text-gray-500">
            Total: {totalPoints} points
          </span>
        </div>
        <div className="divide-y">
          {questions?.map((q, index) => (
            <div key={q.id} className="p-5">
              <div className="flex items-start gap-3">
                <span className="text-sm font-medium text-gray-400 mt-0.5">
                  {index + 1}.
                </span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-2">{q.text}</p>
                  <div className="space-y-1">
                    {(q.options as string[]).map((option: string, oIdx: number) => (
                      <div
                        key={oIdx}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm ${
                          option === q.correct_answer
                            ? "bg-green-50 text-green-700"
                            : "text-gray-600"
                        }`}
                      >
                        {option === q.correct_answer ? (
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-300 flex-shrink-0" />
                        )}
                        {option}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {q.points} point{q.points !== 1 ? "s" : ""} &bull;{" "}
                      {q.type === "multiple_choice"
                        ? "Multiple Choice"
                        : "True/False"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Student Attempts */}
      {attempts && attempts.length > 0 && (
        <div className="bg-white rounded-xl border">
          <div className="p-5 border-b">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                Student Attempts ({attempts.length})
              </h2>
              <Link
                href={`/dashboard/exams/${id}/results`}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                View Full Results →
              </Link>
            </div>
          </div>
          <div className="divide-y">
            {attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="p-5 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {(attempt.profiles as any)?.full_name || "Student"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(attempt.started_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`text-lg font-bold ${
                      attempt.status === "completed"
                        ? Number(attempt.score) >= 50
                          ? "text-green-600"
                          : "text-red-600"
                        : "text-amber-600"
                    }`}
                  >
                    {attempt.status === "completed"
                      ? `${attempt.score}%`
                      : "In Progress"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
