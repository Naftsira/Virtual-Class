<?php

namespace App\Http\Controllers;

use App\Models\Assignment;
use Illuminate\Http\Request;

class AssignmentController extends Controller
{
    public function index(Request $request, string $courseId)
    {
        $assignments = Assignment::where('course_id', $courseId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($assignments);
    }

    public function store(Request $request, string $courseId)
    {
        if ($request->user()->role !== 'lecturer') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'title' => 'required|string',
            'description' => 'nullable|string',
            'due_at' => 'nullable|date',
            'session_id' => 'nullable|uuid|exists:class_sessions,id',
        ]);

        $assignment = Assignment::create([
            'course_id' => $courseId,
            'session_id' => $request->session_id,
            'title' => $request->title,
            'description' => $request->description,
            'due_at' => $request->due_at,
        ]);

        return response()->json($assignment, 201);
    }

    public function show(string $courseId, string $id)
    {
        $assignment = Assignment::where('course_id', $courseId)
            ->with('submissions.student')
            ->findOrFail($id);

        return response()->json($assignment);
    }

    public function update(Request $request, string $courseId, string $id)
    {
        if ($request->user()->role !== 'lecturer') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $assignment = Assignment::where('course_id', $courseId)->findOrFail($id);

        $request->validate([
            'title' => 'sometimes|string',
            'description' => 'nullable|string',
            'due_at' => 'nullable|date',
        ]);

        $assignment->update($request->only('title', 'description', 'due_at'));
        return response()->json($assignment);
    }

    public function destroy(Request $request, string $courseId, string $id)
    {
        if ($request->user()->role !== 'lecturer') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $assignment = Assignment::where('course_id', $courseId)->findOrFail($id);
        $assignment->delete();
        return response()->json(['message' => 'Assignment deleted']);
    }
}
