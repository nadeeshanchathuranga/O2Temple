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
        Schema::create('membership_packages', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['individual', 'company']); // Individual or Company
            $table->string('name'); // Name of person/company
            $table->text('address'); // Address
            $table->date('birthday')->nullable(); // Birthday (only for individuals)
            $table->string('nic')->nullable(); // NIC (National ID)
            $table->string('phone'); // Phone number
            $table->integer('num_of_sessions'); // Number of sessions
            $table->decimal('discount_percentage', 5, 2)->default(0); // Discount percentage
            $table->decimal('full_payment', 10, 2); // Full payment amount
            $table->decimal('advance_payment', 10, 2)->default(0); // Advance payment amount
            $table->decimal('remaining_balance', 10, 2)->default(0); // Remaining balance
            $table->integer('sessions_used')->default(0); // Number of sessions used
            $table->enum('status', ['active', 'inactive', 'expired'])->default('active'); // Package status
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('membership_packages');
    }
};
