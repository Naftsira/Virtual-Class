<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Course extends Model
{
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'code',
        'name',
        'description',
        'lecturer_id',
    ];

    public static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            $model->id = (string) Str::uuid();
            if (empty($model->code)) {
                $model->code = self::generateUniqueCode();
            }
        });
    }

    protected static function generateUniqueCode(): string
    {
        do {
            $code = strtoupper(Str::random(4)) . '-' . strtoupper(Str::random(4));
        } while (self::where('code', $code)->exists());

        return $code;
    }

    public function lecturer()
    {
        return $this->belongsTo(User::class, 'lecturer_id');
    }

    public function enrollments()
    {
        return $this->hasMany(Enrollment::class);
    }

    public function sessions()
    {
        return $this->hasMany(ClassSession::class);
    }
}
