<?php

namespace App\Http\Controllers;

use App\Models\ClassSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class SessionController extends Controller
{
    protected function notifyEnd(string $sessionId): void
    {
        Http::post('http://localhost:3001/internal/session/' . $sessionId . '/end');
    }

    public function index(Request $request, string $courseId)
    {
        $sessions = ClassSession::where('course_id', $courseId)
            ->orderBy('scheduled_at')
            ->get();

        return response()->json($sessions);
    }

    public function store(Request $request, string $courseId)
    {
        $request->validate([
            'title' => 'required|string',
            'description' => 'nullable|string',
            'scheduled_at' => 'required|date',
        ]);

        $session = ClassSession::create([
            'course_id' => $courseId,
            'title' => $request->title,
            'description' => $request->description,
            'scheduled_at' => $request->scheduled_at,
            'status' => 'waiting',
        ]);

        return response()->json($session, 201);
    }

    public function show(string $courseId, string $id)
    {
        $session = ClassSession::where('course_id', $courseId)->findOrFail($id);
        return response()->json($session);
    }

    public function update(Request $request, string $courseId, string $id)
    {
        $session = ClassSession::where('course_id', $courseId)->findOrFail($id);

        $request->validate([
            'title' => 'sometimes|string',
            'description' => 'nullable|string',
            'scheduled_at' => 'sometimes|date',
            'status' => 'sometimes|in:waiting,active,closed',
        ]);

        $session->update($request->only('title', 'description', 'scheduled_at', 'status'));
        return response()->json($session);
    }

    public function destroy(string $courseId, string $id)
    {
        $session = ClassSession::where('course_id', $courseId)->findOrFail($id);
        $this->notifyEnd($id);
        $session->delete();
        return response()->json(['message' => 'Session deleted']);
    }

    public function end(Request $request, string $courseId, string $id)
    {
        if ($request->user()->role !== 'lecturer') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $session = ClassSession::where('course_id', $courseId)->findOrFail($id);
        $this->notifyEnd($id);
        $session->delete();

        return response()->json(['message' => 'Session ended and deleted']);
    }
}
