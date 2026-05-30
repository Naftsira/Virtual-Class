<?php

namespace App\Http\Controllers;

use App\Models\Course;
use Illuminate\Http\Request;

class CourseController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->role === 'lecturer') {
            $courses = Course::where('lecturer_id', $user->id)->get();
        } else {
            $courses = Course::whereHas('enrollments', function ($q) use ($user) {
                $q->where('student_id', $user->id);
            })->get();
        }

        return response()->json($courses);
    }

    public function store(Request $request)
    {
        $request->validate([
            'code' => 'required|string|unique:courses',
            'name' => 'required|string',
            'description' => 'nullable|string',
        ]);

        $course = Course::create([
            'code' => $request->code,
            'name' => $request->name,
            'description' => $request->description,
            'lecturer_id' => $request->user()->id,
        ]);

        return response()->json($course, 201);
    }

    public function show(Request $request, string $id)
    {
        $course = Course::findOrFail($id);
        return response()->json($course);
    }

    public function update(Request $request, string $id)
    {
        $course = Course::where('lecturer_id', $request->user()->id)->findOrFail($id);

        $request->validate([
            'name' => 'sometimes|string',
            'description' => 'nullable|string',
        ]);

        $course->update($request->only('name', 'description'));
        return response()->json($course);
    }

    public function destroy(Request $request, string $id)
    {
        $course = Course::where('lecturer_id', $request->user()->id)->findOrFail($id);
        $course->delete();
        return response()->json(['message' => 'Course deleted']);
    }
}
