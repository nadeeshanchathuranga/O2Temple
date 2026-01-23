<?php

namespace App\Http\Controllers;

use App\Models\Bed;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BedManagementController extends Controller
{
    public function index()
    {
        $beds = Bed::all();

        return Inertia::render('BedManagement/Index', compact('beds'));
    }



    public function store(Request $request)
    {
        $data = $request->validate([
            'bed_number' => 'required|string|max:255|unique:beds,bed_number',
            'status' => 'required|string|in:available,occupied,maintenance',
        ], [
            'bed_number.required' => 'Bed number is required.',
            'bed_number.unique' => 'This bed number already exists. Please choose a different bed number.',
            'bed_number.max' => 'Bed number cannot exceed 255 characters.',
            'status.required' => 'Status is required.',
            'status.in' => 'Status must be one of: available, occupied, or maintenance.',
        ]);

        try {
            $bed = Bed::create($data);
            return redirect()->route('beds.index')->with('success', 'Bed created successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['bed_number' => 'Unable to create bed. Please try again.'])->withInput();
        }
    }





    public function update(Request $request, Bed $bed)
    {
        $data = $request->validate([
            'bed_number' => 'required|string|max:255|unique:beds,bed_number,' . $bed->id,
            'status' => 'required|string|in:available,occupied,maintenance',
        ], [
            'bed_number.required' => 'Bed number is required.',
            'bed_number.unique' => 'This bed number already exists. Please choose a different bed number.',
            'bed_number.max' => 'Bed number cannot exceed 255 characters.',
            'status.required' => 'Status is required.',
            'status.in' => 'Status must be one of: available, occupied, or maintenance.',
        ]);

        try {
            $bed->update($data);
            return redirect()->route('beds.index')->with('success', 'Bed updated successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['bed_number' => 'Unable to update bed. Please try again.'])->withInput();
        }
    }

    public function destroy(Bed $bed)
    {
        $bed->delete();

        return redirect()->route('beds.index');
    }
}
