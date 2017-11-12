module ElmAnalyse exposing (Message, decode, getCoords, getDescription, getShortMessage)

import Json.Decode exposing (Decoder, decodeValue, field, int, list, map, map2, map6, oneOf, string)
import Json.Encode exposing (Value)


type Range
    = SingleRange (List Int)
    | DoubleRange (List Int) (List Int)


range : Decoder Range
range =
    oneOf
        [ map SingleRange (field "range" <| list int)
        , map2 DoubleRange (field "range1" <| list int) (field "range2" <| list int)
        ]


type alias Value =
    { file : String
    , range : Range
    }


value : Decoder Value
value =
    map2 Value
        (field "file" string)
        range


type alias Message =
    { files : List String
    , id : Int
    , message : String
    , status : String
    , type_ : String
    , value : Value
    }


message : Decoder Message
message =
    map6 Message
        (field "files" <| list string)
        (field "id" int)
        (field "message" string)
        (field "status" string)
        (field "type" string)
        (field "value" value)


decode : Json.Encode.Value -> List Message
decode rawJson =
    (Debug.log "decode" <| decodeValue (list message) rawJson)
        |> Result.withDefault []


getCoords : Message -> List ( Int, Int )
getCoords message =
    case message.value.range of
        SingleRange range ->
            reduce range

        DoubleRange range1 range2 ->
            reduce range1


getShortMessage : Message -> String
getShortMessage message =
    String.split "in file" message.message
        |> List.head
        |> Maybe.withDefault ""


getDescription : Message -> String
getDescription message =
    ("**Type:** " ++ message.type_ ++ "<br/>")
        ++ ("**Reference URL:** https://stil4m.github.io/elm-analyse/#/messages/" ++ message.type_)


reduce : List Int -> List ( Int, Int )
reduce range =
    case range of
        a :: b :: rest ->
            ( a, b ) :: reduce rest

        _ ->
            []
