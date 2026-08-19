/** Base class for every error the domain and service layers raise on purpose. */
export class DomainError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = new.target.name;
    }
}

/** Raised when a lookup by key finds nothing in the catalog. */
export class EntityNotFoundError extends DomainError {
    constructor(entity: string, key: string) {
        super(`${entity} "${key}" was not found in the catalog.`);
    }
}

/** Raised when a caller feeds an impossible value into a calculation. */
export class InvalidArgumentError extends DomainError {}
