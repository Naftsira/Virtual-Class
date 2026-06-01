<?php

namespace App\Http\Controllers;

use App\Models\Submission;
use App\Models\Assignment;
use App\Services\StorageService;
use Illuminate\Http\Request;

class SubmissionController extends Controller
{
    public function __construct(protected StorageService $storage) {}

    // Student: lihat submission sendiri
    public function mySubmission(Request $request, string $assignmentId)
    {
        $submission = Submission::where('assignment_id', $assignmentId)
            ->where('student_id', $request->user()->id)
            ->first();

        return response()->json($submission);
    }

    // Lecturer: lihat semua submission
    public function index(string $assignmentId)
    {
        $submissions = Submission::where('assignment_id', $assignmentId)
            ->with('student:id,name,email')
            ->get();

        return response()->json($submissions);
    }

    // Student: submit atau update submission
    public function submit(Request $request, string $assignmentId)
    {
        if ($request->user()->role !== 'student') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'content' => 'nullable|string',
            'file' => 'nullable|file|max:10240', // 10MB
        ]);

        $submission = Submission::firstOrNew([
            'assignment_id' => $assignmentId,
            'student_id' => $request->user()->id,
        ]);

        $submission->content = $request->content;
        $submission->status = 'submitted';
        $submission->submitted_at = now();

        if ($request->hasFile('file')) {
            // Hapus file lama kalau ada
            if ($submission->file_path) {
                $this->storage->delete($submission->file_path);
            }

            $file = $request->file('file');
            $path = "submissions/{$assignmentId}/{$request->user()->id}/" . time() . '_' . $file->getClientOriginalName();
            $url = $this->storage->upload($file, $path);

            // $submission->file_url = $url;
            $submission->file_path = $path;
        }

        $submission->save();

        return response()->json($submission, 201);
    }

    // Lecturer: grade submission
    public function grade(Request $request, string $assignmentId, string $submissionId)
    {
        if ($request->user()->role !== 'lecturer') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'grade' => 'required|numeric|min:0|max:100',
            'feedback' => 'nullable|string',
        ]);

        $submission = Submission::where('assignment_id', $assignmentId)
            ->findOrFail($submissionId);

        $submission->update([
            'grade' => $request->grade,
            'feedback' => $request->feedback,
            'status' => 'graded',
        ]);

        return response()->json($submission);
    }
}
