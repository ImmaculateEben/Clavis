import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Users, Award, BarChart3 } from "lucide-react";

export default async function ExamResultsPage({
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

  const { data: attempts } = await supabase
    .from("exam_attempts")
    .select("*, profiles(full_name, email:id)")
    .eq("exam_id", id)
    .eq("status", "completed")
    .order("score", { ascending: false });

  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("exam_id", id)
    .order("order_number");

  // Calculate analytics
  const completedAttempts = attempts || [];
  const scores = completedAttempts.map((a) => Number(a.score));
  const avgScore =
    scores.length > 0
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : "0";
  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
  const passRate =
    scores.length > 0
      ? ((scores.filter((s) => s >= 50).length / scores.length) * 100).toFixed(
          1
        )
      : "0";

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href={`/dashboard/exams/${id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Exam
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">{exam.title}</h1>
      <p className="text-gray-600 mb-6">Results & Analytics</p>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium">Total Students</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">
            {completedAttempts.length}
          </span>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium">Average Score</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">{avgScore}%</span>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Award className="h-4 w-4" />
            <span className="text-xs font-medium">Highest Score</span>
          </div>
          <span className="text-2xl font-bold text-green-600">
            {highestScore}%
          </span>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <BarChart3 className="h-4 w-4" />
            <span className="text-xs font-medium">Pass Rate</span>
          </div>
          <span className="text-2xl font-bold text-indigo-600">
            {passRate}%
          </span>
        </div>
      </div>

      {/* Score Distribution */}
      <div className="bg-white rounded-xl border mb-6">
        <div className="p-5 border-b">
          <h2 className="font-semibold text-gray-900">Score Distribution</h2>
        </div>
        <div className="p-5">
          {[
            { label: "90-100%", min: 90, max: 100, color: "bg-green-500" },
            { label: "70-89%", min: 70, max: 89, color: "bg-blue-500" },
            { label: "50-69%", min: 50, max: 69, color: "bg-amber-500" },
            { label: "0-49%", min: 0, max: 49, color: "bg-red-500" },
          ].map((range) => {
            const count = scores.filter(
              (s) => s >= range.min && s <= range.max
            ).length;
            const pct =
              scores.length > 0
                ? ((count / scores.length) * 100).toFixed(0)
                : "0";
            return (
              <div key={range.label} className="flex items-center gap-3 mb-3">
                <span className="text-sm text-gray-600 w-16">
                  {range.label}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div
                    className={`${range.color} h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500`}
                    style={{
                      width: `${Math.max(Number(pct), 2)}%`,
                    }}
                  >
                    {Number(pct) > 10 && (
                      <span className="text-xs text-white font-medium">
                        {count}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-500 w-12 text-right">
                  {count} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Student Results Table */}
      <div className="bg-white rounded-xl border">
        <div className="p-5 border-b">
          <h2 className="font-semibold text-gray-900">Student Results</h2>
        </div>
        {completedAttempts.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No completed attempts yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">
                    Rank
                  </th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">
                    Student
                  </th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">
                    Score
                  </th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">
                    Completed
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {completedAttempts.map((attempt, index) => (
                  <tr key={attempt.id} className="hover:bg-gray-50">
                    <td className="py-3 px-5 text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="py-3 px-5">
                      <span className="text-sm font-medium text-gray-900">
                        {(attempt.profiles as any)?.full_name || "Student"}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <span
                        className={`text-sm font-bold ${
                          Number(attempt.score) >= 50
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {attempt.score}%
                      </span>
                    </td>
                    <td className="py-3 px-5 text-sm text-gray-500">
                      {attempt.completed_at
                        ? new Date(attempt.completed_at).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
