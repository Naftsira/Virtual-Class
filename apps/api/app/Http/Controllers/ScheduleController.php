<?php

namespace App\Http\Controllers;

use App\Models\CourseSchedule;
use App\Models\Course;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    // Get schedule untuk course tertentu
    public function index(string $courseId)
    {
        $schedules = CourseSchedule::where('course_id', $courseId)
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        return response()->json($schedules);
    }

    // Set schedule untuk course (replace semua)
    public function sync(Request $request, string $courseId)
    {
        $request->validate([
            'schedules' => 'required|array',
            'schedules.*.day_of_week' => 'required|integer|min:0|max:6',
            'schedules.*.start_time' => 'required|date_format:H:i',
            'schedules.*.end_time' => 'required|date_format:H:i',
        ]);

        // Verify ownership
        $course = Course::where('lecturer_id', $request->user()->id)
            ->findOrFail($courseId);

        // Delete existing and replace
        CourseSchedule::where('course_id', $courseId)->delete();

        foreach ($request->schedules as $s) {
            CourseSchedule::create([
                'course_id' => $courseId,
                'day_of_week' => $s['day_of_week'],
                'start_time' => $s['start_time'],
                'end_time' => $s['end_time'],
            ]);
        }

        return response()->json(
            CourseSchedule::where('course_id', $courseId)
                ->orderBy('day_of_week')
                ->get()
        );
    }

    // Get weekly schedule untuk user yang login
    public function weekly(Request $request)
    {
        $user = $request->user();

        if ($user->role === 'lecturer') {
            $courseIds = Course::where('lecturer_id', $user->id)->pluck('id');
        } else {
            $courseIds = Course::whereHas('enrollments', function ($q) use ($user) {
                $q->where('student_id', $user->id);
            })->pluck('id');
        }

        $schedules = CourseSchedule::whereIn('course_id', $courseIds)
            ->with('course:id,name,code')
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        return response()->json($schedules);
    }
}
