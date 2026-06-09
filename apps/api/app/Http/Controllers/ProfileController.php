<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\StorageService;

class ProfileController extends Controller
{
    public function __construct(protected StorageService $storage) {}

    public function update(Request $request)
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'avatar' => 'sometimes|file|image|max:2048',
        ]);

        $user = $request->user();

        if ($request->has('name')) {
            $user->name = $request->name;
        }

        if ($request->hasFile('avatar')) {
            // Hapus avatar lama
            if ($user->avatar_path) {
                $this->storage->delete($user->avatar_path);
            }

            $file = $request->file('avatar');
            $path = "avatars/{$user->id}/" . time() . '_' . $file->getClientOriginalName();
            $this->storage->upload($file, $path);
            $user->avatar_path = $path;
            $user->avatar = $this->storage->getSignedUrl($path);
        }

        $user->save();

        // Update cookie cache
        return response()->json($user);
    }
}
