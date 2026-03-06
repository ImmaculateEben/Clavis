import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  FileText,
  Users,
  Clock,
  Copy,
  BarChart3,
} from "lucide-react";
import { CopyPinButton } from "@/components/copy-pin-button";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/auth/login");

  // For teachers/admins: show their exams
  if (profile.role === "teacher" || profile.role === "admin") {
    const { data: exams } = await supabase
      .from("exams")
      .select("*, questions(count), exam_attempts(count)")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome, {profile.full_name}
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your exams and view results
            </p>
          </div>
          <Link
            href="/dashboard/exams/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            <Plus className="h-4 w-4" />
            Create Exam
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {exams?.length || 0}
                </p>
                <p className="text-sm text-gray-500">Total Exams</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {exams?.filter((e) => e.status === "active").length || 0}
                </p>
                <p className="text-sm text-gray-500">Active Exams</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {exams?.reduce(
                    (acc, e) => acc + (e.exam_attempts?.[0]?.count || 0),
                    0
                  ) || 0}
                </p>
                <p className="text-sm text-gray-500">Total Attempts</p>
              </div>
            </div>
          </div>
        </div>

        {/* Exam List */}
        <div className="bg-white rounded-xl border">
          <div className="p-5 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Your Exams</h2>
          </div>
          {!exams || exams.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No exams yet
              </h3>
              <p className="text-gray-500 mb-4">
                Create your first exam to get started
              </p>
              <Link
                href="/dashboard/exams/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
              >
                <Plus className="h-4 w-4" />
                Create Exam
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  className="p-5 hover:bg-gray-50 transition flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <Link
                        href={`/dashboard/exams/${exam.id}`}
                        className="text-base font-medium text-gray-900 hover:text-indigo-600 transition truncate"
                      >
                        {exam.title}
                      </Link>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          exam.status === "active"
                            ? "bg-green-100 text-green-700"
                            : exam.status === "draft"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {exam.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{exam.questions?.[0]?.count || 0} questions</span>
                      <span>{exam.duration_minutes} min</span>
                      <span className="flex items-center gap-1">
                        PIN: <span className="font-mono font-medium text-gray-700">{exam.pin}</span>
                        <CopyPinButton pin={exam.pin} />
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      href={`/dashboard/exams/${exam.id}/results`}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition"
                      title="View Results"
                    >
                      <BarChart3 className="h-5 w-5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // For students: show their attempts and PIN entry
  const { data: attempts } = await supabase
    .from("exam_attempts")
    .select("*, exams(title, pin)")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome, {profile.full_name}
          </h1>
          <p className="text-gray-600 mt-1">Enter an exam PIN to get started</p>
        </div>
        <Link
          href="/exam/join"
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
        >
          Enter Exam PIN
        </Link>
      </div>

      {/* Previous Attempts */}
      <div className="bg-white rounded-xl border">
        <div className="p-5 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Your Exam History
          </h2>
        </div>
        {!attempts || attempts.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No exams taken yet
            </h3>
            <p className="text-gray-500">
              Enter an exam PIN to start your first exam
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="p-5 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {(attempt.exams as any)?.title || "Exam"}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {new Date(attempt.started_at).toLocaleDateString()} &bull;{" "}
                    <span
                      className={`font-medium ${
                        attempt.status === "completed"
                          ? "text-green-600"
                          : "text-amber-600"
                      }`}
                    >
                      {attempt.status === "completed"
                        ? `Score: ${attempt.score}%`
                        : "In Progress"}
                    </span>
                  </p>
                </div>
                {attempt.status === "completed" && (
                  <Link
                    href={`/exam/${attempt.exam_id}/result?attempt=${attempt.id}`}
                    className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-md transition font-medium"
                  >
                    View Result
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
