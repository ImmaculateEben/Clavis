import Link from "next/link";
import { KeyRound, BookOpen, ShieldCheck, BarChart3 } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="h-7 w-7 text-indigo-600" />
            <span className="text-xl font-bold text-gray-900">Clavis</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 py-20 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Secure Online Exams,{" "}
            <span className="text-indigo-600">Made Simple</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Create exams, generate secure PINs, and let students take tests
            seamlessly. Auto-grading gives you instant results.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="px-6 py-3 text-base font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
            >
              Create an Account
            </Link>
            <Link
              href="/exam/join"
              className="px-6 py-3 text-base font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition"
            >
              Enter Exam PIN
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-4 pb-20">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 border shadow-sm">
              <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Create Exams</h3>
              <p className="text-gray-600">
                Build exams with multiple choice and true/false questions. Set
                timer durations and manage everything from your dashboard.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 border shadow-sm">
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <ShieldCheck className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">PIN-Based Access</h3>
              <p className="text-gray-600">
                Generate unique 6-digit PINs for each exam. Share with your
                students for secure, controlled access.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 border shadow-sm">
              <div className="h-12 w-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Instant Results</h3>
              <p className="text-gray-600">
                Auto-grading for objective questions with detailed analytics.
                View scores and performance breakdowns instantly.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Clavis. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
