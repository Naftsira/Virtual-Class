<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('submissions', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\DB::raw('gen_random_uuid()'));
            $table->foreignUuid('assignment_id')->constrained('assignments')->cascadeOnDelete();
            $table->foreignUuid('student_id')->constrained('users')->cascadeOnDelete();
            $table->text('content')->nullable();
            $table->string('file_url')->nullable();
            $table->enum('status', ['draft', 'submitted', 'graded'])->default('draft');
            $table->decimal('grade', 5, 2)->nullable();
            $table->text('feedback')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('submissions');
    }
};