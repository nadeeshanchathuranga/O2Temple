<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $adminRole = Role::where('name', 'Admin')->first();
        
        if ($adminRole) {
            User::firstOrCreate(
                ['email' => 'admin@o2temple.com'],
                [
                    'name' => 'Admin User',
                    'password' => Hash::make('O2temple777'),
                    'role_id' => $adminRole->id,
                    'email_verified_at' => now(),
                ]
            );
        }

        // Create sample cashier
        $cashierRole = Role::where('name', 'Cashier')->first();
        if ($cashierRole) {
            User::firstOrCreate(
                ['email' => 'cashier@o2temple.com'],
                [
                    'name' => 'Cashier User',
                    'password' => Hash::make('O2cashier'),
                    'role_id' => $cashierRole->id,
                    'email_verified_at' => now(),
                ]
            );
        }

        // Create sample staff
        $staffRole = Role::where('name', 'Staff')->first();
        if ($staffRole) {
            User::firstOrCreate(
                ['email' => 'staff@o2temple.com'],
                [
                    'name' => 'Staff User',
                    'password' => Hash::make('password'),
                    'role_id' => $staffRole->id,
                    'email_verified_at' => now(),
                ]
            );
        }
    }
}
