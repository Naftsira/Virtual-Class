<?php

namespace App\Http\Controllers;

use App\Models\Submission;
use App\Models\Assignment;
use App\Services\StorageService;
use Illuminate\Http\Request;

class SubmissionController extends Controller
{
    public function __construct(protected StorageService $storage) {}

    protected function withSignedUrl(Submission $submission): array
    {
        $data = $submission->toArray();
        if ($submission->file_path) {
            $data['file_url'] = $this->storage->getSignedUrl($submission->file_path);
        } else {
            $data['file_url'] = null;
        }
        return $data;
    }

    public function mySubmission(Request $request, string $assignmentId)
    {
        $submission = Submission::where('assignment_id', $assignmentId)
            ->where('student_id', $request->user()->id)
            ->first();

        if (!$submission) return response()->json(null);

        return response()->json($this->withSignedUrl($submission));
    }

    public function index(string $assignmentId)
    {
        $submissions = Submission::where('assignment_id', $assignmentId)
            ->with('student:id,name,email')
            ->get();

        return response()->json($submissions->map(fn($s) => $this->withSignedUrl($s)));
    }

    public function submit(Request $request, string $assignmentId)
    {
        if ($request->user()->role !== 'student') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'content' => 'nullable|string',
            'file' => 'nullable|file|max:10240',
        ]);

        $submission = Submission::firstOrNew([
            'assignment_id' => $assignmentId,
            'student_id' => $request->user()->id,
        ]);

        $submission->content = $request->content;
        $submission->status = 'submitted';
        $submission->submitted_at = now();

        if ($request->hasFile('file')) {
            if ($submission->file_path) {
                $this->storage->delete($submission->file_path);
            }

            $file = $request->file('file');
            $path = "submissions/{$assignmentId}/{$request->user()->id}/" . time() . '_' . $file->getClientOriginalName();
            $this->storage->upload($file, $path);
            $submission->file_path = $path;
        }

        $submission->save();

        return response()->json($this->withSignedUrl($submission), 201);
    }

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

        return response()->json($this->withSignedUrl($submission));
    }
}
