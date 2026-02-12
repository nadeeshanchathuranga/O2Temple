<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Bed;

class BedSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $beds = [
            [
                'bed_number' => 'S1',
                'display_name' => 'Bed S1',
                'grid_row' => 1,
                'grid_col' => 1,
                'bed_type' => 'standard',
                'hourly_rate' => 1500.00,
                'status' => 'available',
                'description' => 'Standard therapy bed',
            ],
            [
                'bed_number' => 'S2',
                'display_name' => 'Bed S2',
                'grid_row' => 1,
                'grid_col' => 2,
                'bed_type' => 'standard',
                'hourly_rate' => 1500.00,
                'status' => 'available',
                'description' => 'Standard therapy bed',
            ],
            [
                'bed_number' => 'S3',
                'display_name' => 'Bed S3',
                'grid_row' => 1,
                'grid_col' => 3,
                'bed_type' => 'vip',
                'hourly_rate' => 2000.00,
                'status' => 'available',
                'description' => 'VIP therapy bed with premium amenities',
            ],
        ];

        foreach ($beds as $bed) {
            Bed::updateOrCreate(
                ['bed_number' => $bed['bed_number']],
                $bed
            );
        }
    }
}
