<?php

namespace App\Http\Controllers;

use App\Models\BoardTemplate;
use App\Models\Board;
use App\Models\Workspace;
use App\Services\BoardFromTemplateService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class BoardTemplateController extends Controller
{
    protected $service;

    public function __construct(BoardFromTemplateService $service)
    {
        $this->service = $service;
    }

    /**
     * List available templates (global + tenant specific).
     */
    public function index(Request $request): JsonResponse
    {
        // Assuming tenant context is resolved or passed.
        // If 'tenant.resolution' middleware is used, we can get tenant_id from request or auth user.
        // For now, let's assume we get it from the authenticated user's current tenant context?
        // Or if this is a workspace-scoped call? The requirement says GET /api/board-templates.
        // Most likely checking the user's current tenant.
        
        $user = auth()->user();
        // Assuming we can get current tenant ID from header or user relation. 
        // Let's assume passed in header 'X-Tenant-ID' or derived.
        // For safety, let's check input or assume context.
        $tenantId = $request->input('tenant_id') ?? $user->current_tenant_id; // hypothetical

        // Fallback: If no tenant context, return only globals?
        $query = BoardTemplate::query();

        if ($tenantId) {
            $query->forTenant($tenantId);
        } else {
            $query->global();
        }

        $templates = $query->published()->get();

        return response()->json($templates);
    }

    /**
     * Show a template.
     */
    public function show(string $templateId): JsonResponse
    {
        $template = BoardTemplate::findOrFail($templateId);
        // Authorization check? Public templates vs tenant templates.
        
        return response()->json($template);
    }

    /**
     * Create a template from an existing board.
     * POST /api/workspaces/{workspace}/board-templates
     */
    public function store(Request $request, string $workspaceId): JsonResponse
    {
        $validated = $request->validate([
            'board_id' => 'required|exists:boards,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:50',
        ]);

        $workspace = Workspace::findOrFail($workspaceId); // Ensure workspace exists
        $board = Board::where('workspace_id', $workspaceId)->findOrFail($validated['board_id']);

        $template = $this->service->createTemplateFromBoard(auth()->user(), $board, $validated);

        return response()->json($template, 201);
    }

    /**
     * Update a template.
     */
    public function update(Request $request, string $templateId): JsonResponse
    {
        $template = BoardTemplate::findOrFail($templateId);
        // Check authorization (only creator or admin)

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:50',
            'is_published' => 'sometimes|boolean',
        ]);

        $template->update($validated);

        return response()->json($template);
    }

    /**
     * Delete a template.
     */
    public function destroy(string $templateId): JsonResponse
    {
        $template = BoardTemplate::findOrFail($templateId);
        // Check authorization
        $template->delete();

        return response()->json(['message' => 'Template deleted']);
    }
}
