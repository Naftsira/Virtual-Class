<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CourseController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\AssignmentController;
use App\Http\Controllers\SubmissionController;
use App\Http\Controllers\EnrollmentController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('courses', CourseController::class);
    Route::apiResource('courses.sessions', SessionController::class);
    Route::post('courses/{course}/sessions/{session}/end', [SessionController::class, 'end']);

    Route::get('sessions/{id}', function($id) {
        return response()->json(\App\Models\ClassSession::findOrFail($id));
    });

    Route::apiResource('courses.assignments', AssignmentController::class);

    Route::post('profile/update', [App\Http\Controllers\ProfileController::class, 'update']);

Route::get('assignments/{id}', function($id) {
        return response()->json(\App\Models\Assignment::findOrFail($id));
    });

    Route::get('assignments/{assignment}/submissions', [SubmissionController::class, 'index']);
    Route::get('assignments/{assignment}/submissions/my', [SubmissionController::class, 'mySubmission']);
    Route::post('assignments/{assignment}/submit', [SubmissionController::class, 'submit']);
    Route::post('assignments/{assignment}/submissions/{submission}/grade', [SubmissionController::class, 'grade']);

    // Enrollment
    Route::post('enroll', [EnrollmentController::class, 'enroll']);
    Route::delete('courses/{course}/unenroll', [EnrollmentController::class, 'unenroll']);
    Route::get('courses/{course}/students', [EnrollmentController::class, 'students']);
});

Route::middleware('auth:sanctum')->get('sessions/{id}/ban-status', function($id, \Illuminate\Http\Request $request) {
    // Ban check via Express MongoDB
    $response = \Illuminate\Support\Facades\Http::get('http://localhost:3001/internal/ban-status', [
        'sessionId' => $id,
        'studentId' => $request->user()->id,
    ]);
    return response()->json($response->json());
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('schedule/weekly', [App\Http\Controllers\ScheduleController::class, 'weekly']);
    Route::get('courses/{course}/schedule', [App\Http\Controllers\ScheduleController::class, 'index']);
    Route::post('courses/{course}/schedule', [App\Http\Controllers\ScheduleController::class, 'sync']);
});
