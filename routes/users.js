// TODO: Implement user related routes -> Export
import { Router } from 'express';

import {userData} from '../data/index.js'
import helpers from '../helpers.js';
import { showRankings, getRankingById, deleteRanking, addComment, editRanking} from '../data/musicData.js';
import {users} from '../config/mongoCollections.js';

// TODO: Import data functions
const router = Router();

// Login
router
    .route("/")
    .get(async(req, res)=>{
        try{ 
            return res.render("about",
            {
                title: "About" 
            })
        }catch(e){
            return res.status(404).render('error', { error: e.message, status: 404, username: req.session.user.userName });  
        }
    })


router
    .route('/login')
    .get(async (req, res) => {
        try {
            return res.render("login", {
                title: "Login",
            })
        } catch (e) {
            return res.status(404).render('error', { error: e.message, status: 404 });
        }
    })
    .post(
        async (req, res) =>{
            //TODO Input Validation
            try{
                // Input Validation
                let username = req.body.user;
                let password = req.body.pass;
                if(!username || !password){
                    throw new Error('Error: Must provide username and password')
                }
                if(!helpers.isValidString(username) || !helpers.isValidString(password)){
                    throw new Error('Error: Username and password must be valid strings')
                }
                if(username.length < 5){
                    throw new Error('Error: Username must be at least 5 characters long.')
                }
                if (password.trim().length < 8) {
                    throw new Error('Error: Password must be at least 8 characters')
                }
                else if (password.split(" ").length > 1) {
                    throw new Error('Error: Password must not have spaces')
                }
                else if (!password.match(/[A-Z]/)) {
                    throw new Error("Password must contain at least one uppercase character.")
                }
                else if (!password.match(/[0-9]/)) {
                    throw new Error("Password must contain at least one number.")
                }
                else if (!password.match(/[!@#$%^&*]/)) {
                    throw new Error("Password must contain at least one special character.")
                }

                // Log in User
                username = username.trim().toLowerCase();
                password = password.trim();
                const person = await userData.loginUser(username, password);
                req.session.user = person;
                let url = '/user/' + username;
                return res.redirect(url);
            }catch(e){
                return res.status(400).render('login', {title: "Login", error: e.message});
            }
        }
    )

router
    .route('/logout')
    .get(async (req, res) => {
        try{
            req.session.destroy();
            return res.render('logout', { title: "Logout" });
        } catch (e) {
            return res.status(404).render('error', {error: e.message, status: 400, username: req.session.user.userName});
        }
    });

// Registration
router
    .route('/register')
    .get(async (req, res) =>{
        try {
            return res.render("register", {
                title: "Register",
            })
        } catch (e) {
            return res.status(404).render('error', { error: e.message, status: 404});
        }
    })
    .post(
        async (req, res) =>{
            //TODO Input Validation
            try{
                // Input Validation
                let username = req.body.user;
                username = username.trim();
                username = username.toLowerCase();
                let password = req.body.pass;
                password = password.trim();
                let confirmPassword = req['body']['confirm-pass'];
                confirmPassword = confirmPassword.trim();
                if(!username || !password || !confirmPassword){
                    throw new Error('Error: Must provide username, password, and confirm your password.');
                }
                if(!helpers.isValidString(username) || !helpers.isValidString(password) || !helpers.isValidString(confirmPassword)){
                    throw new Error('Error: Username, password, and confirm password must all be valid strings');
                }
                if(username.length < 5){
                    throw new Error('Error: Username must be at least 5 characters long.');
                }
                if (password.trim().length < 8) {
                    throw new Error("Password must be at least 8 characters long.");
                }
                else if (password.split(" ").length > 1) {
                    throw new Error("Password cannot have spaces.");
                }
                else if (!password.match(/[A-Z]/)) {
                    throw new Error("Password must contain at least one uppercase character.");
                }
                else if (!password.match(/[0-9]/)) {
                    throw new Error("Password must contain at least one number.");
                }
                else if (!password.match(/[!@#$%^&*]/)) {
                    throw new Error("Password must contain at least one special character.");
                }
                if(password != confirmPassword){
                    throw new Error("Confirm password must match password");
                }
                // Register User
                const user = await userData.registerUser(username, password, confirmPassword);
                return res.redirect('/login');
            }catch(e){
                return res.status(400).render('error', {error: e.message, status: 400})
            }

        }
    )


// Registration
router
    .route('/about')
    .get(async (req, res) =>{
        try {
            return res.render("about", {
                title: "About",
            })
        } catch (e) {
            return res.status(404).render('error', { error: e.message, status: 404, username: req.session.user.userName });
        }
    });

// Show user profile
router
    .route('/user/:username') 
    .get(async (req, res) =>{
        try{
            // TODO: 
            let user = req.params.username
            user = user.toLowerCase();
            if(req.session.user.userName != user){
                throw new Error('Cannot access another users private page');
            }
            return res.render('user', {title: user, username: user});
        }catch(e){
            // TODO: Revise later
            return res.status(404).render('error', { error: e.message, status: 404, username: req.session.user.userName});
        }
    })

router
    .route('/user/:username/rankings')
    .get(async (req,res) => {
        try{
            let username = req.params.username;
            username = username.toLowerCase();
            if(username != req.session.user.userName){
                throw new Error('Cannot view other users personal rankings page');
            }
            const rankingAlreadyExists = req.session.data?.rankingAlreadyExists || false;        //Need to add the ability to display messaeg if ranking already exists
            delete req.session.data;
            const userRankings= await showRankings(username);
            if(userRankings.rankings[0] === 'No rankings yet.'){
                return res.render('personal_rankings', {userName: username} );
            }
            else{
                return res.render('personal_rankings', {userRankings:userRankings, rankingAlreadyExists: rankingAlreadyExists, userName: username});
            }
        } catch (e){
            return res.status(404).render('error', {error: e.message, status: 404, username: req.session.user.userName});
        }
    })

router
    .route('/user/:userid/rankings/:rankingid')
    .get(async (req,res) => {
        try{
            const usersCollection = await users();
            const exists = await usersCollection.findOne({userName: req.params.userid});
            if(!exists){
                throw new Error("Ranking does not exist");
            }

            const rankingid = req.params.rankingid;
            let userId = req.params.userid;
            userId = userId.toLowerCase();
            const userRanking= await getRankingById(rankingid);
            const cookieUserName= req.session.user.userName
            const canEditRanking = cookieUserName === req.params.userid
            let comment_arr = userRanking.comments;
            return res.render('rankinginfo', {userRanking: userRanking, canEditRanking, userName: userId, rankingid, comments: comment_arr});
        } catch (e){
            return res.status(404).render('error', {error: e.message, status: 404, username: req.session.user.userName});
        }
    });


router
.route('/user/:userid/rankings/:rankingid/edit')
.get(async (req,res) => {
    try{
        const rankingid = req.params.rankingid;
        let userId = req.params.userid;
        userId = userId.toLowerCase();
        if(userId != req.session.user.userName){
            throw new Error('Cannot edit other users rankings');
        }
        const userRanking= await getRankingById(rankingid);
        const cookieUserName= req.session.user.userName
        const canEditRanking = cookieUserName === req.params.userid
        //return res.status(400).render('editOrComment', {mode: 'edit'})
        //return res.render('editOrCommentRanking', {userRanking: userRanking, canEditRanking, userName: userId, rankingid});
        return res.render('editOrComment', {edit: canEditRanking})
    } catch (e){
        return res.status(404).render('error', {error: e.message, status: 404, username: req.session.user.userName});
    }
})
.post(async (req,res) => {
    try{
        let userId = req.params.userid;
        let rankingid = req.params.rankingid;

        let newranking = req.body.editRanking;
        let newreview = req.body.editReview;
        let newrank = await editRanking(rankingid, newranking, newreview);
        return res.render('deleted', {username: userId, deloredit: 'Ranking Edited!'});
    } catch (e) {
        return res.status(404).render('error', {error: e.message, status: 404, username: req.session.user.userName});
    }
});


router
.route('/user/:userid/rankings/:rankingid/delete')
.get(async (req,res) => {
    try{
        const rankingid = req.params.rankingid;
        let userId = req.params.userid;
        userId = userId.toLowerCase();
        deleteRanking(rankingid);
        return res.render('deleted', {username: userId, deloredit: 'Ranking Deleted!'}); 
    } catch (e){
        return res.status(404).render('error', {error: e.message, status: 404});
    }
})

router
    .route('/user/:userid/rankings/:rankingid/comment')
    .get(async (req,res) => {
        try{
            const rankingid = req.params.rankingid;
            let userId = req.params.userid;
            userId = userId.toLowerCase();
            if(userId === req.session.user.userName){
                throw new Error('Cannot comment on your own post');
            }
            const userRanking = await getRankingById(rankingid);
            const cookieUserName= req.session.user.userName
            const canEditRanking = cookieUserName === req.params.userid
            return res.render('editOrComment', {comment: true});
            //return res.render('editOrCommentRanking', {userRanking: userRanking, canEditRanking, userName: userId, rankingid});
        } catch (e){
            return res.status(404).render('error', {error: e.message, status: 404, username: req.session.user.userName});
        }
    })
    .post(async (req, res) =>{
        try{
            let comment = req.body.comment;
            comment = comment.trim();
            if(comment.length === 0){
                throw new Error('Cannot submit empty comment');
            }
            if(comment.length > 250){
                throw new Error('Exceeded comment length limit (250)');
            }
            let new_ranking = await addComment(req.params.rankingid, comment);
            let url = `/user/${req.params.userid}/rankings/${req.params.rankingid}`;
            return res.redirect(url);
        } catch (e) {
            return res.status(400).render('error', {error: e.message, status: 400, username: req.session.user.userName});
        }
    })


export default router;
