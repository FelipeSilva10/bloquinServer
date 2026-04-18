/**
 * services/projectService.ts
 *
 * Versão WEB — substitui o projectService.ts do desktop que usava Supabase.
 * A assinatura dos métodos é compatível com o IdeScreen original.
 */

import { blqProjects } from './api';
import type { BoardKey } from '../blockly/blocks';

export const ProjectService = {

  async getProjectData(projectId: string) {
    const { data, error } = await blqProjects.get(projectId);
    if (error || !data) return { data: null, error };

    return {
      data: {
        nome:           data.nome,
        target_board:   data.target_board,
        workspace_data: data.workspace_data,
      },
      error: null,
    };
  },

  async updateBoard(projectId: string, board: BoardKey) {
    return blqProjects.save(projectId, { target_board: board });
  },

  async saveProject(projectId: string, board: BoardKey, workspaceData: string) {
    return blqProjects.save(projectId, {
      workspace_data: workspaceData,
      target_board:   board,
    });
  },
};
