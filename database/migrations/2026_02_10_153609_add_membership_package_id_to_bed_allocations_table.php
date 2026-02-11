<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('bed_allocations', function (Blueprint $table) {
            $table->foreignId('membership_package_id')->nullable()->after('customer_id')->constrained('membership_packages')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bed_allocations', function (Blueprint $table) {
            $table->dropForeign(['membership_package_id']);
            $table->dropColumn('membership_package_id');
        });
    }
};
