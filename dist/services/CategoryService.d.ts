interface Category {
    id: string;
    user_id: string;
    name: string;
    color: string;
    icon: string;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}
interface CreateCategoryData {
    name: string;
    color: string;
    icon: string;
}
export declare class CategoryService {
    getUserCategories(userId: string): Promise<Category[]>;
    createCategory(userId: string, data: CreateCategoryData): Promise<Category>;
    updateCategory(categoryId: string, userId: string, updateData: Partial<CreateCategoryData>): Promise<Category>;
    deleteCategory(categoryId: string, userId: string): Promise<void>;
}
export {};
//# sourceMappingURL=CategoryService.d.ts.map