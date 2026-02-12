<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\MembershipPackage;
use App\Models\Package;

class MembershipPackageSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $p1 = Package::where('name', 'P1')->first();
        $p2 = Package::where('name', 'P2')->first();
        $p3 = Package::where('name', 'P3')->first();

        $memberships = [
            [
                'package_id' => $p1?->id,
                'type' => 'individual',
                'name' => 'Alex',
                'address' => '123 Colombo Road, Colombo 03',
                'birthday' => '1990-05-15',
                'nic' => '199012345678',
                'phone' => '0987654322',
                'num_of_sessions' => 5,
                'discount_percentage' => 0,
                'full_payment' => 25000.00,
                'advance_payment' => 10000.00,
                'sessions_used' => 0,
                'status' => 'active',
            ],
            [
                'package_id' => $p2?->id,
                'type' => 'individual',
                'name' => 'Nimal Perera',
                'address' => '456 Galle Road, Dehiwala',
                'birthday' => '1985-08-20',
                'nic' => '198523456789',
                'phone' => '0771234567',
                'num_of_sessions' => 10,
                'discount_percentage' => 10,
                'full_payment' => 100000.00,
                'advance_payment' => 50000.00,
                'sessions_used' => 0,
                'status' => 'active',
            ],
            [
                'package_id' => $p3?->id,
                'type' => 'company',
                'name' => 'Saman Silva',
                'address' => '789 Kandy Road, Kadawatha',
                'birthday' => '1992-12-10',
                'nic' => '199234567890',
                'phone' => '0769876543',
                'num_of_sessions' => 8,
                'discount_percentage' => 15,
                'full_payment' => 120000.00,
                'advance_payment' => 120000.00,
                'sessions_used' => 0,
                'status' => 'active',
            ],
        ];

        foreach ($memberships as $membership) {
            if ($membership['package_id']) {
                MembershipPackage::updateOrCreate(
                    ['phone' => $membership['phone'], 'package_id' => $membership['package_id']],
                    $membership
                );
            }
        }
    }
}
