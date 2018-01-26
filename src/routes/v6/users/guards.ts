import { RouteGuard } from "../../../util/Route";
import { CODES } from "../../../util/ErrorEmitter";

export const PasswordGuard: RouteGuard = async (req, res, data, next) => {
    if (!req.user) {
        return res.reject(CODES.UNAUTHORIZED);
    }
    if (!req.body.password || !(await req.user.comparePasswords(req.body.password))) {
        res.status(400).json({password: ["Password does not match."]});
        return;
    }
    next();
};
