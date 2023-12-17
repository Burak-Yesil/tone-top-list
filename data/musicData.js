import {users, rankings, albums} from '../config/mongoCollections.js';
import * as spotify from './spotifyAPI.js';
import {ObjectId} from 'mongodb';
import { validUser, validPassword } from '../helpers.js';

export const getRankings = async (album_id) => {
    // checks if album has been ranked yet. If yes, returns rankings and information for that album. 
    // If not, finds album from spotifyAPI and returns that there are no rankings
    album_id = album_id.trim();
    const rankingsCollection = await rankings();
    const album = await rankingsCollection.findOne({ albumId: album_id });
    console.log(album_id)
    const albumObject = await spotify.getAlbumObject(album_id);
    const currAlbumName= albumObject.albumName;

    if (!album) {
        try{
            if (!currAlbumName) { 
                throw 'Album could not be found.'; 
            }
            return { albumName: currAlbumName, album_rankings: ['No rankings yet - add one!'] };
        }
        catch (error) {
            throw error
        }
        // const addAlbum = await albums.insertOne(album);
        
    }
    // If album exists, return its rankings and 
    const rankings_arr = []
    const albums_rankings = await rankingsCollection.find({albumId: album_id}).toArray();
    //console.log(albums_rankings);
    // for (let i in rankingsCollection) {
    //     let curr = i;
    //     if (curr.albumId == album_id) {
    //         rankings_arr.push(curr);
    //     }
    // }
    // const rankings = album.rankings;
    // I don't think each album is going to hold all of its rankings
    return { albumName: currAlbumName, rankings: albums_rankings };
}

export const addRanking = async (albumid, username, rating, review, review_bool, comments =[]) => {
    // lets user add ranking and then adds ranking to the rankings database
    // also adds ranking to the array of rankings in the album object; edits albums database

    validUser(username);
    username = username.trim();
    if (!rating) throw 'Rating must be provided.';
    if (rating < 1 || rating > 5) {
        throw 'Rating must be an integer between 1 and 5.';
    }
    if (review && typeof review !== 'string') throw 'Review must be a string, if provided.';
    // TODO: word limit for reviews?

    let albumObject = await spotify.getAlbumObject(albumid);
    const currAlbumName=albumObject.albumName

    let newRanking = {
        albumId: albumid,
        albumName: currAlbumName,
        userName: username,
        rating: rating,
        review: review,
        review_provided: review_bool,
        comments: comments
    }

    // add ranking to collection of all album rankings 
    const rankingcol = await rankings();
    const addRanking = await rankingcol.insertOne(newRanking);

    const albumcol = await albums();
    const alb = await albumcol.findOne({albumId: albumid});
    if(!alb){
        let newalb = {
            albumId : albumid,
            albumName: currAlbumName,
            avgRanking: rating
        }
        const addAlb = await albumcol.insertOne(newalb);
    } else {
        let newrank = (alb.avgRanking + rating)/2
        await albumcol.updateOne({ albumId: albumid }, { $set: { avgRanking: newrank } });
    }


    // find all rankings for this album
    const obj = await getRankings(albumid);
    const album_name = obj.albumName;  // the album object in the collection
    const rankings_obj = obj.rankings; // array of rankings for specific album

    return {successful: true};
    // Unecessary for this part: can use this code when calculating trending albums tho
    // let total = 0;
    // for (i = 0; i < rankings.length; i++) {
    //     total += rankings[i].rating;
    // }
    // const avg = total / rankings.length;

    // let album = {
        
    // }
    // album.avgranking = avg;
}

/**
 * @returns the user from the database.
 */
export const findUser = async (username) => {
    validUser(username);
    username = username.trim();
    const usersCollection = await users();
    const user = await usersCollection.findOne({ 'userName': username });
    if (!user) throw "User not found.";
    return user; // TODO: do we want to return anything specific?
}

/**
 * @returns the top 5 albums with best average rankings from albums collection.
 * If there are 0 albums, then it returns a message saying there are no albums.
 * If there are <5 albums, then it returns all of them.
 */
export const topRanked = async () => {
    let rankingsCollection = await rankings();
    rankingsCollection = await rankingsCollection.find({}).toArray()

    if (rankingsCollection.countDocuments == 0) {
        return ['There are currently no albums in the database. You should add some!'];
    }
    const albumRankings = {}; // albums and all of their rankings

    for (let r in rankingsCollection) {
        if (!albumRankings[rankingsCollection[r].albumId]) {
            albumRankings[rankingsCollection[r].albumId] = 1;
        } else {
            albumRankings[rankingsCollection[r].albumId] = albumRankings[rankingsCollection[r].albumId] + 1;
        }
    }

    for (let a in albumRankings) {
        let avg = a / a.length;
        albumRankings[a.albumId] = avg;
    }
    // TODO: format the data to be ready to be printed on the webpage
    let sorted = Object.keys(albumRankings).sort(function (a, b) { return albumRankings[a] - albumRankings[b] });
    sorted = sorted.slice(0, 5);
    const albumObjects = [];
    for (let i = 0; i < sorted.length; i++) {
        const albumObject = await spotify.getAlbumObject(sorted[i]);
        albumObjects.push({
            albumId: sorted[i],
            albumName: albumObject.albumName
        });
    }
    return albumObjects;
}

/**
 * @returns the top 5 albums with the most rankings, ignoring their value, from the albums collection.
 * If there are 0 albums, then it returns a message saying there are no albums.
 * If there are <5 albums, then it returns all of them.
 */
export const mostFrequent = async () => {
    let rankingsCollection = await rankings();
    rankingsCollection = await rankingsCollection.find({}).toArray()

    if (rankingsCollection.countDocuments == 0) {
        return ['There are currently no albums in the database. You should add some!'];
    }
    const albumRankings = {}; // key:album, value:number of rankings

    for (let r in rankingsCollection) {
        if (!albumRankings[rankingsCollection[r].albumId]) {
            albumRankings[rankingsCollection[r].albumId] = 1;
        } else {
            albumRankings[rankingsCollection[r].albumId] = albumRankings[rankingsCollection[r].albumId] + 1;
        }
    }
    // TODO: format the data to appear nicely on the page (maybe {author, album}?)
    let sorted = Object.keys(albumRankings).sort(function (a, b) { return albumRankings[a] - albumRankings[b] });
    sorted = sorted.slice(0, 5);
    const albumObjects = [];
    for (let i = 0; i < sorted.length; i++) {
        const albumObject = await spotify.getAlbumObject(sorted[i]);
        albumObjects.push({
            albumId: sorted[i],
            albumName: albumObject.albumName
        });
    }
    return albumObjects;
}


/**
 * @returns a random recommendation from the top 10 albums with best average rankings
 */
export const getRecommendations = async () => {
    const top = await topRanked();
    const random = Math.floor(Math.random() * 10);
    return top[random];
}

export const showRankings = async (username) => {
    validUser(username);
    const usersCollection = await users();
    const rankingsCollection = await rankings();
    const user = await usersCollection.findOne({ 'userName': username });
    const userRankings = await rankingsCollection.find({userName: username}).toArray();
    if (userRankings.length===0){
        return {username: username, rankings: ['No rankings yet.']};
    }
    
    const formattedRankings = userRankings.map(ranking => ({
        id: ranking._id,
        userName: ranking.userName,
        albumId: ranking.albumId,
        albumName: ranking.albumName, 
        rating: ranking.rating,
        review: ranking.review,
        review_provided: ranking.review_provided
    }));
    return {username: username, rankings: formattedRankings};

}

export const allAlbumRankings = async (albumId)=>{
    const rankingsCollection = await rankings();
    const albumRankings = await rankingsCollection.find({albumId: albumId}).toArray();

    const obj = await getRankings(albumId);
    const albumname = obj.albumName;  // the album object in the collection

    if (albumRankings.length === 0){
        return {albumName: albumname, rankings: ['No rankings for this album yet, add one!!']};
    }
    console.log(albumRankings);
    const formattedRankings = albumRankings.map(ranking=>({
        id: ranking._id.toString(),
        userName:ranking.userName,
        rating:ranking.rating,
        review: ranking.review,
        review_provided: ranking.review_provided
    }));

    return {albumName: albumname, rankings: formattedRankings};
}

export const editRanking = async (rankingId, rating, review)=>{
    const rankingCollection= await rankings();
    const existingRanking = await rankingCollection.findOne({_id: new ObjectId(rankingId)});
    if (!existingRanking) throw 'Error: ranking not found';
    const updatedRanking={
        $set:{
            rating:rating,
            review: review,
            review_provided: Boolean(review)
        }
    };
    const result = await rankingCollection.findOneAndUpdate(
        {_id: new ObjectId(rankingId)},
        updatedRanking,
        {returnDocument: 'after'}
    );
    if(!result.value){
        throw 'Error: failed to update';
    }
    return{
        rankingId: result.value._id.toString(),
        userName: result.value.userName,
        albumId: result.value.albumId,
        albumName: result.value.albumName,
        rating: result.value.rating,
        review: result.value.review,
        review_provided: result.value.review_provided,
        comments: result.value.comments
    };
}

export const addComment= async (rankingId, commentMessage) =>{
    const rankingCollection = await rankings();
    const existingRanking = await rankingCollection.findOne({_id: new ObjectId(rankingId)});
    if(!existingRanking) throw 'Error: ranking not found';
    const updatedRanking = {
        $push: {comments: commentMessage}
    };

    const result= await rankingCollection.findOneAndUpdate(
        {_id: new ObjectId(rankingId)},
        updatedRanking,
        {returnDocument: 'after'}
    );
    if(!result.value) throw 'Error: update failed';

    return {
        rankingId: result.value._id.toString(),
        userName: result.value.userName,
        albumId: result.value.albumId,
        albumName: result.value.albumName,
        rating: result.value.rating,
        review: result.value.review,
        review_provided: result.value.review_provided,
        comments: result.value.comments
    };
};

export const getRankingById = async (id)=>{
    const rankingcol = await rankings();
    const ranking = await rankingcol.findOne({_id: new ObjectId(id)});

    return ranking;
}

export const trending = async() => {
    let albcol = await albums();

    albcol = await albcol.find({}).toArray()

    if (albcol.countDocuments == 0) {
        return ['There are currently no albums in the database. You should add some!'];
    }
    const albumRankings = {}; // key:album, value:avg ranking

    for (let r in albcol) {
        if (!albumRankings[albcol[r].albumId]) {
            albumRankings[albcol[r].albumId] = albcol[r].avgRanking;
        }
    }

    let sorted = Object.keys(albumRankings).sort(function (a, b) { return albumRankings[a] - albumRankings[b] });
    sorted = sorted.slice(0, 5);
    const albumObjects = [];
    for (let i = 0; i < sorted.length; i++) {
        const albumObject = await spotify.getAlbumObject(sorted[i]);
        albumObjects.push({
            albumId: sorted[i],
            albumName: albumObject.albumName
        });
    }
    return albumObjects;

}
