<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Package;

class PackageSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $packages = [
            [
                'name' => 'P1',
                'duration_minutes' => 60,
                'price' => 5000.00,
            ],
            [
                'name' => 'P2',
                'duration_minutes' => 60,
                'price' => 10000.00,
            ],
            [
                'name' => 'P3',
                'duration_minutes' => 90,
                'price' => 15000.00,
            ],
        ];

        foreach ($packages as $package) {
            Package::updateOrCreate(
                ['name' => $package['name']],
                $package
            );
        }
    }
}
