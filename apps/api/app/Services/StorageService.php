<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;

class StorageService
{
    protected string $url;
    protected string $key;
    protected string $bucket;

    public function __construct()
    {
        $this->url = config('services.supabase.url');
        $this->key = config('services.supabase.key');
        $this->bucket = config('services.supabase.bucket');
    }

    public function upload(UploadedFile $file, string $path): void
    {
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$this->key}",
            'x-upsert' => 'true',
        ])->attach(
            'file',
            file_get_contents($file->getRealPath()),
            $file->getClientOriginalName()
        )->post("{$this->url}/storage/v1/object/{$this->bucket}/{$path}");

        if ($response->failed()) {
            throw new \Exception('Upload failed: ' . $response->body());
        }
    }

    public function delete(string $path): void
    {
        Http::withHeaders([
            'Authorization' => "Bearer {$this->key}",
        ])->delete("{$this->url}/storage/v1/object/{$this->bucket}/{$path}");
    }

    public function getSignedUrl(string $path, int $expiresIn = 3600): string
    {
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$this->key}",
        ])->post("{$this->url}/storage/v1/object/sign/{$this->bucket}/{$path}", [
            'expiresIn' => $expiresIn,
        ]);

        $signedUrl = $response->json('signedURL');
        if (!$signedUrl) return '';

        return "{$this->url}/storage/v1{$signedUrl}";
    }
}
