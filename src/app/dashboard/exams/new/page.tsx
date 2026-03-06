"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: string;
  type: "multiple_choice" | "true_false";
  text: string;
  options: string[];
  correct_answer: string;
  points: number;
}

export default function CreateExamPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(30);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const addQuestion = (type: "multiple_choice" | "true_false") => {
    const newQ: Question = {
      id: crypto.randomUUID(),
      type,
      text: "",
      options:
        type === "multiple_choice"
          ? ["", "", "", ""]
          : ["True", "False"],
      correct_answer: "",
      points: 1,
    };
    setQuestions([...questions, newQ]);
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateOption = (questionId: string, index: number, value: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const newOptions = [...q.options];
          newOptions[index] = value;
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  };

  const addOption = (questionId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId && q.type === "multiple_choice") {
          return { ...q, options: [...q.options, ""] };
        }
        return q;
      })
    );
  };

  const removeOption = (questionId: string, index: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId && q.options.length > 2) {
          const newOptions = q.options.filter((_, i) => i !== index);
          return {
            ...q,
            options: newOptions,
            correct_answer:
              q.correct_answer === q.options[index] ? "" : q.correct_answer,
          };
        }
        return q;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (questions.length === 0) {
      toast.error("Add at least one question");
      return;
    }

    // Validate all questions have correct answers
    const incomplete = questions.find(
      (q) => !q.text.trim() || !q.correct_answer
    );
    if (incomplete) {
      toast.error("All questions must have text and a correct answer selected");
      return;
    }

    setLoading(true);

    try {
      // Generate PIN
      const { data: pinData, error: pinError } = await supabase.rpc(
        "generate_exam_pin"
      );

      if (pinError) throw pinError;

      // Create exam
      const { data: exam, error: examError } = await supabase
        .from("exams")
        .insert({
          title,
          description,
          duration_minutes: duration,
          pin: pinData,
          status: "draft",
        })
        .select()
        .single();

      if (examError) throw examError;

      // Insert questions
      const questionsToInsert = questions.map((q, index) => ({
        exam_id: exam.id,
        type: q.type,
        text: q.text,
        options: q.options.filter((o) => o.trim()),
        correct_answer: q.correct_answer,
        points: q.points,
        order_number: index,
      }));

      const { error: qError } = await supabase
        .from("questions")
        .insert(questionsToInsert);

      if (qError) throw qError;

      toast.success(`Exam created! PIN: ${pinData}`);
      router.push(`/dashboard/exams/${exam.id}`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to create exam");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create New Exam</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Exam Details */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Exam Details</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              placeholder="e.g. Mathematics Mid-Term Exam"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              rows={2}
              placeholder="Brief description of the exam..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes)
            </label>
            <input
              type="number"
              min={1}
              max={300}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-32 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            />
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              Questions ({questions.length})
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => addQuestion("multiple_choice")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition"
              >
                <Plus className="h-4 w-4" />
                Multiple Choice
              </button>
              <button
                type="button"
                onClick={() => addQuestion("true_false")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition"
              >
                <Plus className="h-4 w-4" />
                True/False
              </button>
            </div>
          </div>

          {questions.length === 0 && (
            <div className="bg-white rounded-xl border p-12 text-center">
              <p className="text-gray-500">
                No questions added yet. Click the buttons above to add
                questions.
              </p>
            </div>
          )}

          {questions.map((question, qIndex) => (
            <div
              key={question.id}
              className="bg-white rounded-xl border p-6 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-5 w-5 text-gray-300" />
                  <span className="text-sm font-medium text-gray-500">
                    Q{qIndex + 1}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      question.type === "multiple_choice"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {question.type === "multiple_choice"
                      ? "Multiple Choice"
                      : "True/False"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-gray-500">Points:</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={question.points}
                      onChange={(e) =>
                        updateQuestion(question.id, {
                          points: Number(e.target.value),
                        })
                      }
                      className="w-16 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeQuestion(question.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question Text
                </label>
                <textarea
                  value={question.text}
                  onChange={(e) =>
                    updateQuestion(question.id, { text: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  rows={2}
                  placeholder="Enter your question..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Options{" "}
                  <span className="text-gray-400 font-normal">
                    (click to mark correct answer)
                  </span>
                </label>
                <div className="space-y-2">
                  {question.options.map((option, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuestion(question.id, {
                            correct_answer:
                              question.type === "true_false"
                                ? option
                                : option,
                          })
                        }
                        className={`flex-shrink-0 h-5 w-5 rounded-full border-2 transition ${
                          question.correct_answer === option && option
                            ? "border-green-500 bg-green-500"
                            : "border-gray-300 hover:border-green-400"
                        }`}
                      >
                        {question.correct_answer === option && option && (
                          <svg
                            className="h-full w-full text-white p-0.5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>
                      {question.type === "true_false" ? (
                        <span className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm">
                          {option}
                        </span>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={option}
                            onChange={(e) =>
                              updateOption(question.id, oIndex, e.target.value)
                            }
                            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm"
                            placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                          />
                          {question.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() =>
                                removeOption(question.id, oIndex)
                              }
                              className="p-1 text-gray-400 hover:text-red-500 transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
                {question.type === "multiple_choice" &&
                  question.options.length < 6 && (
                    <button
                      type="button"
                      onClick={() => addOption(question.id)}
                      className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      + Add Option
                    </button>
                  )}
              </div>
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 py-4">
          <Link
            href="/dashboard"
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || questions.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Creating..." : "Create Exam"}
          </button>
        </div>
      </form>
    </div>
  );
}
