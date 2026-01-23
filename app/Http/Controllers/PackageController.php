<?php

namespace App\Http\Controllers;

use App\Models\Package;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PackageController extends Controller
{
    public function index()
    {
        $packages = Package::all();

        return Inertia::render('PackageManagement/Index', compact('packages'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'duration_minutes' => 'required|integer|min:0',
            'price' => 'required|numeric|min:0',
        ]);

        $package = Package::create($data);

        return redirect()->route('packages.index')->with('success', 'Package created successfully.');
    }

    public function update(Request $request, Package $package)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'duration_minutes' => 'required|integer|min:0',
            'price' => 'required|numeric|min:0',
        ]);

        $package->update($data);

        return redirect()->route('packages.index')->with('success', 'Package updated successfully.');
    }

    public function destroy(Package $package)
    {
        $package->delete();

        return redirect()->route('packages.index')->with('success', 'Package deleted successfully.');
    }
}
