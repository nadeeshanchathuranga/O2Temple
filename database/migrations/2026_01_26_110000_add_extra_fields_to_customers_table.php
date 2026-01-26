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
        Schema::table('customers', function (Blueprint $table) {
            $table->string('nic', 20)->nullable()->after('email');
            $table->string('address', 255)->nullable()->after('nic');
            $table->integer('age')->nullable()->after('address');
            $table->date('dob')->nullable()->after('age');
            $table->string('description', 500)->nullable()->after('dob');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn(['nic', 'address', 'age', 'dob', 'description']);
        });
    }
};
