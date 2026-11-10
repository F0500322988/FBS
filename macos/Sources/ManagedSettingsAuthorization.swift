import Security

@MainActor enum ManagedSettingsAuthorization {
    static func authorize() -> Bool {
        var authorization: AuthorizationRef?
        guard AuthorizationCreate(nil, nil, [], &authorization) == errAuthorizationSuccess,
              let authorization = authorization else { return false }
        defer { AuthorizationFree(authorization, []) }
        return "system.privilege.admin".withCString { name in
            var item = AuthorizationItem(name: name, valueLength: 0, value: nil, flags: 0)
            return withUnsafeMutablePointer(to: &item) { pointer in
                var rights = AuthorizationRights(count: 1, items: pointer)
                return AuthorizationCopyRights(authorization, &rights, nil,
                    [.interactionAllowed, .extendRights, .preAuthorize], nil) == errAuthorizationSuccess
            }
        }
    }
}
