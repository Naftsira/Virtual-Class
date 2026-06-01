<?php

namespace App\Http\Controllers;

use App\Models\Enrollment;
use App\Models\Course;
use Illuminate\Http\Request;

class EnrollmentController extends Controller
{
    // Student: enroll ke course via code
    public function enroll(Request $request)
    {
        if ($request->user()->role !== 'student') {
            return response()->json(['message' => 'Only students can enroll'], 403);
        }

        $request->validate([
            'code' => 'required|string',
        ]);

        $course = Course::where('code', $request->code)->first();
        if (!$course) {
            return response()->json(['message' => 'Course not found'], 404);
        }

        $existing = Enrollment::where('student_id', $request->user()->id)
            ->where('course_id', $course->id)
            ->first();

        if ($existing) {
            return response()->json(['message' => 'Already enrolled'], 409);
        }

        $enrollment = Enrollment::create([
            'student_id' => $request->user()->id,
            'course_id' => $course->id,
            'enrolled_at' => now(),
        ]);

        return response()->json([
            'message' => 'Enrolled successfully',
            'course' => $course,
        ], 201);
    }

    // Student: unenroll dari course
    public function unenroll(Request $request, string $courseId)
    {
        $enrollment = Enrollment::where('student_id', $request->user()->id)
            ->where('course_id', $courseId)
            ->first();

        if (!$enrollment) {
            return response()->json(['message' => 'Not enrolled'], 404);
        }

        $enrollment->delete();
        return response()->json(['message' => 'Unenrolled successfully']);
    }

    // Lecturer: lihat semua student di course
    public function students(Request $request, string $courseId)
    {
        $course = Course::where('lecturer_id', $request->user()->id)
            ->findOrFail($courseId);

        $enrollments = Enrollment::where('course_id', $courseId)
            ->with('student:id,name,email')
            ->get();

        return response()->json($enrollments);
    }
}
